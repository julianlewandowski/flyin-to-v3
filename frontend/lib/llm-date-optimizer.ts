/**
 * LLM Date Optimizer
 * 
 * Phase 1: Uses OpenAI API to analyze flight pricing patterns and identify optimal date pairs
 * across the entire date range before making expensive SerpAPI calls.
 * 
 * This dramatically reduces SerpAPI calls by pre-filtering to the best date combinations
 * based on pricing trends, seasonal patterns, and user preferences.
 */

import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"

const OptimizedDatePairSchema = z.object({
  depart_date: z.string().describe("Departure date in YYYY-MM-DD format"),
  return_date: z.string().describe("Return date in YYYY-MM-DD format"),
  estimated_price: z.number().optional().describe("Estimated price in EUR if available from web search"),
  confidence: z.number().min(0).max(1).describe("Confidence score 0-1 for this date pair"),
  reasoning: z.string().describe("Why this date pair is optimal (e.g., 'Cheapest mid-week option', 'Avoids peak season')"),
})

const DateOptimizationResultSchema = z.object({
  optimized_dates: z
    .array(OptimizedDatePairSchema)
    .max(5)
    .describe("Up to 5 optimal date pairs for flight search, ranked by price and preference alignment"),
  search_summary: z
    .string()
    .describe("Summary of web search findings across the date range"),
})

type DateOptimizationResult = z.infer<typeof DateOptimizationResultSchema>

export interface DateOptimizationInput {
  origin_airports: string[]
  destination_airports: string[]
  start_date: string // YYYY-MM-DD
  end_date: string // YYYY-MM-DD
  trip_length_min: number
  trip_length_max: number
  budget?: number | null
  preferences?: {
    budget_sensitivity?: "low" | "medium" | "high"
    flexibility?: "strict" | "moderate" | "flexible"
    preferred_airlines?: string[]
    preferred_weekdays?: string[]
    avoid_weekdays?: string[]
  }
}

/**
 * Optimize flight search dates using OpenAI web search.
 * 
 * This function uses OpenAI's reasoning capabilities to analyze flight pricing patterns,
 * seasonal trends, and user preferences to identify the top 5 optimal date pairs
 * across the user's entire date range before making expensive SerpAPI calls.
 * 
 * Returns at most 5 date pairs that should be searched with SerpAPI.
 */
export async function optimizeFlightDates(
  input: DateOptimizationInput
): Promise<Array<{
  depart_date: string
  return_date: string
  estimated_price?: number
  confidence: number
  reasoning: string
}>> {
  console.log("[Date Optimizer] Starting optimization for:", {
    origins: input.origin_airports,
    destinations: input.destination_airports,
    date_range: `${input.start_date} to ${input.end_date}`,
    trip_length: `${input.trip_length_min}-${input.trip_length_max} days`,
  })

  try {
    // Build comprehensive prompt that instructs OpenAI to use web search
    const prompt = buildOptimizationPrompt(input)

    // Use OpenAI with structured output for reliable parsing
    const { object: result } = await generateObject({
      model: openai("gpt-4o-mini"), // Use capable model for date optimization
      schema: DateOptimizationResultSchema,
      prompt,
      temperature: 0.2, // Low temperature for consistent, factual results
    })

    console.log(
      `[Date Optimizer] Optimization complete: ${result.optimized_dates.length} date pairs identified`
    )
    console.log("[Date Optimizer] Search summary:", result.search_summary)

    // Validate and return optimized dates
    const validatedDates = result.optimized_dates.map((date) => {
      // Ensure dates are within range and trip length is valid
      const departDate = new Date(date.depart_date)
      const returnDate = new Date(date.return_date)
      const tripLengthDays =
        Math.ceil((returnDate.getTime() - departDate.getTime()) / (1000 * 60 * 60 * 24))

      if (
        date.depart_date < input.start_date ||
        date.return_date > input.end_date ||
        tripLengthDays < input.trip_length_min ||
        tripLengthDays > input.trip_length_max
      ) {
        console.warn(
          `[Date Optimizer] Invalid date pair filtered: ${date.depart_date} -> ${date.return_date}`
        )
        return null
      }

      return {
        depart_date: date.depart_date,
        return_date: date.return_date,
        estimated_price: date.estimated_price,
        confidence: date.confidence,
        reasoning: date.reasoning,
      }
    })

    // Filter out nulls and ensure we have at most 5
    const validDates = validatedDates
      .filter((d): d is NonNullable<typeof d> => d !== null)
      .slice(0, 5)

    if (validDates.length === 0) {
      console.warn("[Date Optimizer] No valid dates found, using fallback")
      return generateDateFallback(input)
    }

    return validDates
  } catch (error) {
    console.error("[Date Optimizer] Error during optimization:", error)
    console.log("[Date Optimizer] Falling back to heuristic date generation")
    return generateDateFallback(input)
  }
}

function buildOptimizationPrompt(input: DateOptimizationInput): string {
  const originsText = input.origin_airports.join(", ")
  const destinationsText = input.destination_airports.join(", ")
  const dateRange = `${input.start_date} to ${input.end_date}`
  const tripLength = `${input.trip_length_min}-${input.trip_length_max} days`
  const budgetText = input.budget ? `Budget: €${input.budget}` : "No strict budget"
  
  const prefsText = input.preferences
    ? `
Preferences:
- Budget sensitivity: ${input.preferences.budget_sensitivity || "medium"}
- Flexibility: ${input.preferences.flexibility || "moderate"}
${input.preferences.preferred_airlines?.length ? `- Preferred airlines: ${input.preferences.preferred_airlines.join(", ")}` : ""}
${input.preferences.preferred_weekdays?.length ? `- Preferred weekdays: ${input.preferences.preferred_weekdays.join(", ")}` : ""}
${input.preferences.avoid_weekdays?.length ? `- Avoid weekdays: ${input.preferences.avoid_weekdays.join(", ")}` : ""}`
    : ""

  return `You are an expert flight price analyst. Your task is to use web search capabilities to find the CHEAPEST and BEST flight dates before making expensive API calls.

FLIGHT SEARCH PARAMETERS:
- Origin airports: ${originsText}
- Destination airports: ${destinationsText}
- Date range: ${dateRange}
- Required trip length: ${tripLength}
${budgetText}${prefsText}

YOUR MISSION:
1. Analyze flight pricing patterns across the ENTIRE date range (${input.start_date} to ${input.end_date})
2. Apply knowledge of flight pricing trends:
   - Mid-week flights (Tue-Thu) are typically 15-30% cheaper than weekends
   - Shoulder seasons (between peak and off-peak) often have better deals
   - Holidays, school breaks, and peak travel seasons drive prices up
   - Airlines often release deals on Tuesdays
   - Red-eye flights and early morning flights are typically cheaper
3. Identify the TOP 5 date pairs (depart_date, return_date) that are:
   - Most likely to be CHEAPEST within the date range based on pricing patterns
   - Valid for trip length of ${input.trip_length_min}-${input.trip_length_max} days
   - Aligned with user preferences (budget, flexibility, weekdays)
   - Distributed across the date range to maximize coverage

CRITICAL REQUIREMENTS:
- Return EXACTLY 5 date pairs (or fewer if the range is too narrow)
- Each date pair MUST have a trip duration between ${input.trip_length_min} and ${input.trip_length_max} days
- Dates MUST be within ${input.start_date} to ${input.end_date}
- Prioritize dates most likely to be CHEAPEST based on known patterns
- Consider mid-week flights (Tue-Thu) which are typically 15-30% cheaper
- Avoid peak seasons, holidays, and school breaks
- Include a mix of dates across the range, not all clustered together

PRICING ANALYSIS STRATEGY:
- Identify which months/weeks in the range are likely off-peak or shoulder season
- Factor in known holiday periods that affect pricing
- Consider day-of-week patterns (weekdays vs weekends)
- Account for seasonal variations (summer peak, winter holidays, etc.)
- Apply regional knowledge about the origin/destination pair

OUTPUT FORMAT:
Return up to 5 optimal date pairs ranked from cheapest/best to least optimal.
For each date pair, provide:
- depart_date: YYYY-MM-DD
- return_date: YYYY-MM-DD (must be exactly ${input.trip_length_min}-${input.trip_length_max} days after depart_date)
- estimated_price: Approximate price in EUR if found in web search (optional)
- confidence: 0-1 score based on how certain you are this is a good date
- reasoning: Brief explanation (e.g., "Cheapest mid-week option in shoulder season")

IMPORTANT: These 5 date pairs will be the ONLY ones searched via expensive SerpAPI calls, so choose wisely to maximize value while minimizing API costs.

ANALYSIS SUMMARY:
Provide a brief summary of your pricing analysis, including:
- Price trends and patterns you identified across the date range
- Best time periods for cheapest flights based on seasonal and weekly patterns
- Any seasonal considerations or holidays affecting pricing
- Notable patterns or insights that informed your date selections`
}

/**
 * Fallback date generation when OpenAI optimization fails.
 * Generates 5 heuristic-based date pairs across the range.
 */
function generateDateFallback(input: DateOptimizationInput): Array<{
  depart_date: string
  return_date: string
  estimated_price?: number
  confidence: number
  reasoning: string
}> {
  console.log("[Date Optimizer] Generating fallback dates")
  
  const startDate = new Date(input.start_date)
  const endDate = new Date(input.end_date)
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  
  // Generate 5 date pairs distributed across the range
  const numDates = Math.min(5, Math.max(1, Math.floor(daysDiff / 7)))
  const avgTripLength = Math.floor((input.trip_length_min + input.trip_length_max) / 2)
  
  const datePairs: Array<{
    depart_date: string
    return_date: string
    estimated_price?: number
    confidence: number
    reasoning: string
  }> = []
  
  for (let i = 0; i < numDates; i++) {
    const progress = i / (numDates - 1 || 1)
    const daysFromStart = Math.floor(daysDiff * progress * 0.7) // Use first 70% of range
    
    const departDate = new Date(startDate)
    departDate.setDate(departDate.getDate() + daysFromStart)
    
    // Prefer mid-week (Tuesday = day 2)
    const currentWeekday = departDate.getDay()
    if (currentWeekday === 0 || currentWeekday === 6) {
      // Move to Tuesday
      const daysToTuesday = (2 - currentWeekday + 7) % 7
      departDate.setDate(departDate.getDate() + daysToTuesday)
    }
    
    const returnDate = new Date(departDate)
    returnDate.setDate(returnDate.getDate() + avgTripLength)
    
    // Ensure within range
    if (returnDate > endDate) {
      returnDate.setTime(endDate.getTime())
      const newDepart = new Date(returnDate)
      newDepart.setDate(newDepart.getDate() - avgTripLength)
      if (newDepart >= startDate) {
        departDate.setTime(newDepart.getTime())
      } else {
        continue // Skip this combination
      }
    }
    
    const departStr = departDate.toISOString().split("T")[0]
    const returnStr = returnDate.toISOString().split("T")[0]
    
    if (departStr >= input.start_date && returnStr <= input.end_date && returnStr > departStr) {
      datePairs.push({
        depart_date: departStr,
        return_date: returnStr,
        confidence: 0.6 - i * 0.1, // Decreasing confidence for later dates
        reasoning: `Fallback date ${i + 1}: Mid-week departure with ${avgTripLength}-day trip`,
      })
    }
  }
  
  // If we have fewer than 5, add more dates
  while (datePairs.length < Math.min(5, numDates)) {
    const lastDate = datePairs[datePairs.length - 1]
    if (!lastDate) break
    
    const nextDepart = new Date(lastDate.depart_date)
    nextDepart.setDate(nextDepart.getDate() + 7) // One week later
    
    const nextReturn = new Date(nextDepart)
    nextReturn.setDate(nextReturn.getDate() + avgTripLength)
    
    const nextDepartStr = nextDepart.toISOString().split("T")[0]
    const nextReturnStr = nextReturn.toISOString().split("T")[0]
    
    if (nextDepartStr >= input.start_date && nextReturnStr <= input.end_date && nextReturnStr > nextDepartStr) {
      datePairs.push({
        depart_date: nextDepartStr,
        return_date: nextReturnStr,
        confidence: 0.5,
        reasoning: `Fallback date ${datePairs.length + 1}: Additional mid-week option`,
      })
    } else {
      break // Can't add more dates
    }
  }
  
  return datePairs.slice(0, 5)
}


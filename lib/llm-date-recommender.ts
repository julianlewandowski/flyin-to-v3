/**
 * LLM Date Recommender
 * 
 * Uses an LLM to analyze a date range and recommend the cheapest dates
 * to search for flights within that range.
 */

import { generateObject } from "ai"
import { z } from "zod"

const DateRecommendationSchema = z.object({
  recommended_dates: z.array(
    z.object({
      outbound_date: z.string().describe("Departure date in YYYY-MM-DD format"),
      return_date: z.string().describe("Return date in YYYY-MM-DD format"),
      reasoning: z.string().describe("Why this date combination is recommended (e.g., 'Mid-week flights are typically cheaper', 'Avoids peak season')"),
      priority: z.number().min(1).max(10).describe("Priority score 1-10, where 10 is highest priority (cheapest/most recommended)"),
    })
  ).describe("Array of recommended date combinations to search"),
})

type DateRecommendations = z.infer<typeof DateRecommendationSchema>

export interface DateRecommendationInput {
  origin: string
  destinations: string[]
  start_date: string // YYYY-MM-DD
  end_date: string // YYYY-MM-DD
  budget?: number | null
  trip_duration_min?: number
  trip_duration_max?: number
  preferred_weekdays?: string[]
}

/**
 * Get recommended dates for flight searches using LLM
 * Analyzes the date range and suggests cheapest dates to search
 */
export async function recommendDates(input: DateRecommendationInput): Promise<DateRecommendations["recommended_dates"]> {
  const prompt = buildDateRecommendationPrompt(input)

  try {
    const { object: recommendations } = await generateObject({
      model: "openai/gpt-4o-mini",
      schema: DateRecommendationSchema,
      prompt,
      temperature: 0.3, // Lower temperature for more consistent recommendations
    })

    // Sort by priority (highest first) and limit to 10 recommendations
    const sorted = recommendations.recommended_dates
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10)

    console.log(`[LLM Date Recommender] Recommended ${sorted.length} date combinations`)
    return sorted
  } catch (error) {
    console.error("[LLM Date Recommender] Error getting date recommendations:", error)
    // Fallback: generate dates evenly spaced across the range
    return generateDateFallback(input)
  }
}

function buildDateRecommendationPrompt(input: DateRecommendationInput): string {
  const destinationsText = input.destinations.join(", ")
  const dateRange = `${input.start_date} to ${input.end_date}`
  const durationText = input.trip_duration_min && input.trip_duration_max
    ? `REQUIRED Trip Duration: ${input.trip_duration_min}-${input.trip_duration_max} days (MANDATORY - return_date MUST be exactly this many days after outbound_date)`
    : ""
  const budgetText = input.budget ? `Budget: €${input.budget}` : ""
  const weekdaysText = input.preferred_weekdays?.length
    ? `Preferred weekdays: ${input.preferred_weekdays.join(", ")}`
    : ""

  return `You are a flight price expert. Analyze the following flight search request and recommend the cheapest dates to search for flights.

Origin: ${input.origin}
Destinations: ${destinationsText}
Date Range: ${dateRange}
${durationText ? durationText + "\n" : ""}${budgetText ? budgetText + "\n" : ""}${weekdaysText ? weekdaysText + "\n" : ""}

CRITICAL REQUIREMENT:
${durationText ? `- For EACH outbound_date, calculate return_date = outbound_date + (${input.trip_duration_min} to ${input.trip_duration_max} days)
- The trip duration (return_date - outbound_date) MUST be between ${input.trip_duration_min} and ${input.trip_duration_max} days
- DO NOT return flights with 1-2 day trips if the required duration is ${input.trip_duration_min}-${input.trip_duration_max} days
- Example: If outbound_date is 2025-07-15 and trip duration is 7-14 days, return_date should be between 2025-07-22 and 2025-07-29` : ""}

Your task:
1. Analyze the date range and identify the cheapest dates to search for flights
2. Consider factors like:
   - Mid-week flights are typically cheaper than weekends
   - Off-peak seasons are cheaper than peak seasons
   - Avoiding holidays and school breaks
   - Tuesday/Wednesday departures are often cheapest
   - Return flights on weekdays are often cheaper
3. Recommend multiple date combinations (outbound + return) that are likely to have the cheapest flights
4. Ensure all dates fall within the specified range: ${input.start_date} to ${input.end_date}
${durationText ? `5. CRITICAL: For each outbound_date, calculate return_date = outbound_date + (${input.trip_duration_min} to ${input.trip_duration_max} days). Verify the trip duration is correct.` : ""}

Return an array of recommended date combinations, each with:
- outbound_date: Departure date (YYYY-MM-DD)
- return_date: Return date (YYYY-MM-DD) ${durationText ? `- MUST be ${input.trip_duration_min}-${input.trip_duration_max} days after outbound_date` : ""}
- reasoning: Brief explanation of why this date is recommended
- priority: Score 1-10 (10 = highest priority/cheapest expected)

${durationText ? `VERIFICATION: Before returning, verify that each return_date is exactly ${input.trip_duration_min}-${input.trip_duration_max} days after the corresponding outbound_date.` : ""}

Prioritize dates that are:
- Mid-week (Tuesday-Thursday)
- In off-peak seasons
- Not during major holidays
${durationText ? `- Trip duration of exactly ${input.trip_duration_min}-${input.trip_duration_max} days` : "- Allow for flexible trip durations"}

Return at least 5-10 date combinations to maximize chances of finding cheap flights.`
}

/**
 * Fallback: Generate dates evenly spaced across the range
 * Used when LLM fails
 */
function generateDateFallback(input: DateRecommendationInput): Array<{
  outbound_date: string
  return_date: string
  reasoning: string
  priority: number
}> {
  const startDate = new Date(input.start_date)
  const endDate = new Date(input.end_date)
  const recommendations: Array<{
    outbound_date: string
    return_date: string
    reasoning: string
    priority: number
  }> = []

  // Calculate days in range
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  
  // Generate 8-10 date combinations
  const numRecommendations = Math.min(10, Math.max(5, Math.floor(daysDiff / 7)))
  
  // Prefer mid-week dates (Tuesday-Thursday)
  const preferredWeekdays = [2, 3, 4] // Tuesday, Wednesday, Thursday
  
  for (let i = 0; i < numRecommendations; i++) {
    // Distribute dates across the range
    const progress = i / (numRecommendations - 1)
    const outboundDaysFromStart = Math.floor(daysDiff * progress * 0.7) // Use first 70% of range for outbound
    
    const outboundDate = new Date(startDate)
    outboundDate.setDate(outboundDate.getDate() + outboundDaysFromStart)
    
    // Adjust to nearest preferred weekday
    const currentWeekday = outboundDate.getDay()
    if (!preferredWeekdays.includes(currentWeekday)) {
      // Find nearest preferred weekday
      let adjustment = 0
      let minDist = 7
      for (const preferred of preferredWeekdays) {
        const dist = Math.abs((preferred - currentWeekday + 7) % 7)
        if (dist < minDist) {
          minDist = dist
          adjustment = preferred > currentWeekday ? dist : -dist
        }
      }
      outboundDate.setDate(outboundDate.getDate() + adjustment)
    }
    
    // Calculate return date - STRICTLY enforce trip duration
    const minDuration = input.trip_duration_min || 3
    const maxDuration = input.trip_duration_max || 14
    
    // Use a duration within the range (vary it across recommendations)
    const durationOptions = []
    for (let d = minDuration; d <= maxDuration; d++) {
      durationOptions.push(d)
    }
    const duration = durationOptions[Math.floor((i % durationOptions.length))] || Math.floor((minDuration + maxDuration) / 2)
    
    const returnDate = new Date(outboundDate)
    returnDate.setDate(returnDate.getDate() + duration)
    
    // Ensure return date is within range - if not, skip this combination
    if (returnDate > endDate) {
      // Try to adjust outbound date to fit
      const newOutbound = new Date(returnDate)
      newOutbound.setDate(newOutbound.getDate() - duration)
      if (newOutbound >= startDate && newOutbound <= endDate) {
        outboundDate.setTime(newOutbound.getTime())
      } else {
        // Can't fit this duration, skip
        continue
      }
    }
    
    // Verify trip duration is correct
    const actualDuration = Math.ceil((returnDate.getTime() - outboundDate.getTime()) / (1000 * 60 * 60 * 24))
    if (actualDuration < minDuration || actualDuration > maxDuration) {
      // Skip if duration doesn't match
      continue
    }
    
    // Format dates
    const outboundStr = outboundDate.toISOString().split("T")[0]
    const returnStr = returnDate.toISOString().split("T")[0]
    
    // Skip if dates are invalid or out of range
    if (outboundStr < input.start_date || returnStr > input.end_date || returnStr <= outboundStr) {
      continue
    }
    
    recommendations.push({
      outbound_date: outboundStr,
      return_date: returnStr,
      reasoning: `Mid-week departure (${outboundDate.toLocaleDateString("en-US", { weekday: "long" })}) with ${duration}-day trip duration`,
      priority: 10 - i, // Decreasing priority
    })
  }
  
  return recommendations
}


/**
 * LLM Date Recommender
 * 
 * Uses an LLM to analyze a date range and recommend the cheapest dates
 * to search for flights within that range.
 */

import { generateObject } from "ai"
import { z } from "zod"

const DateRecommendationSchema = z.object({
  recommended_date: z.object({
    outbound_date: z.string().describe("Departure date in YYYY-MM-DD format - the single best date to search"),
    return_date: z.string().describe("Return date in YYYY-MM-DD format - calculated based on trip duration"),
    reasoning: z.string().describe("Why this specific date combination is recommended (e.g., 'Mid-week flights are typically cheaper', 'Avoids peak season')"),
  }).describe("The single best date combination to search for flights"),
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
 * Get the single best recommended date for flight search using LLM
 * Returns only ONE date combination to minimize API calls
 */
export async function recommendDates(input: DateRecommendationInput): Promise<Array<{
  outbound_date: string
  return_date: string
  reasoning: string
  priority: number
}>> {
  const prompt = buildDateRecommendationPrompt(input)

  try {
    const { object: recommendation } = await generateObject({
      model: "openai/gpt-4o-mini",
      schema: DateRecommendationSchema,
      prompt,
      temperature: 0.3, // Lower temperature for more consistent recommendations
    })

    // Return as array with priority 10 (highest) since it's the single best recommendation
    const result = [{
      outbound_date: recommendation.recommended_date.outbound_date,
      return_date: recommendation.recommended_date.return_date,
      reasoning: recommendation.recommended_date.reasoning,
      priority: 10,
    }]

    console.log(`[LLM Date Recommender] Recommended single best date: ${result[0].outbound_date} -> ${result[0].return_date}`)
    return result
  } catch (error) {
    console.error("[LLM Date Recommender] Error getting date recommendations:", error)
    // Fallback: generate single date
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
1. Analyze the date range and identify the SINGLE BEST date to search for flights
2. Consider factors like:
   - Mid-week flights are typically cheaper than weekends
   - Off-peak seasons are cheaper than peak seasons
   - Avoiding holidays and school breaks
   - Tuesday/Wednesday departures are often cheapest
   - Return flights on weekdays are often cheaper
3. Select the ONE best date combination (outbound + return) that is most likely to have the cheapest flights
4. Ensure dates fall within the specified range: ${input.start_date} to ${input.end_date}
${durationText ? `5. CRITICAL: Calculate return_date = outbound_date + (${input.trip_duration_min} to ${input.trip_duration_max} days). Verify the trip duration is correct.` : ""}

Return the SINGLE best date combination with:
- outbound_date: Departure date (YYYY-MM-DD) - the one best date to search
- return_date: Return date (YYYY-MM-DD) ${durationText ? `- MUST be ${input.trip_duration_min}-${input.trip_duration_max} days after outbound_date` : ""}
- reasoning: Brief explanation of why this specific date is the best choice

${durationText ? `VERIFICATION: Before returning, verify that return_date is exactly ${input.trip_duration_min}-${input.trip_duration_max} days after outbound_date.` : ""}

Choose the date that is:
- Mid-week (Tuesday-Thursday) if possible
- In off-peak seasons
- Not during major holidays
${durationText ? `- Trip duration of exactly ${input.trip_duration_min}-${input.trip_duration_max} days` : "- Appropriate trip duration"}

IMPORTANT: Return only ONE date combination - the single best option to search.`
}

/**
 * Fallback: Generate a single best date
 * Used when LLM fails - returns one date in the middle of the range, mid-week
 */
function generateDateFallback(input: DateRecommendationInput): Array<{
  outbound_date: string
  return_date: string
  reasoning: string
  priority: number
}> {
  const startDate = new Date(input.start_date)
  const endDate = new Date(input.end_date)
  
  // Calculate days in range
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  
  // Pick a date in the middle of the range (40% through)
  const outboundDaysFromStart = Math.floor(daysDiff * 0.4)
  const outboundDate = new Date(startDate)
  outboundDate.setDate(outboundDate.getDate() + outboundDaysFromStart)
  
  // Adjust to nearest Tuesday (mid-week, typically cheapest)
  const currentWeekday = outboundDate.getDay()
  if (currentWeekday !== 2) { // Not Tuesday
    const daysToTuesday = (2 - currentWeekday + 7) % 7
    if (daysToTuesday > 3) {
      // If more than 3 days away, go back to previous Tuesday
      outboundDate.setDate(outboundDate.getDate() - (7 - daysToTuesday))
    } else {
      outboundDate.setDate(outboundDate.getDate() + daysToTuesday)
    }
  }
  
  // Calculate return date - use average trip duration
  const minDuration = input.trip_duration_min || 7
  const maxDuration = input.trip_duration_max || 14
  const avgDuration = Math.floor((minDuration + maxDuration) / 2)
  
  const returnDate = new Date(outboundDate)
  returnDate.setDate(returnDate.getDate() + avgDuration)
  
  // Ensure return date is within range
  if (returnDate > endDate) {
    // Adjust outbound date backwards to fit
    const newOutbound = new Date(returnDate)
    newOutbound.setDate(newOutbound.getDate() - avgDuration)
    if (newOutbound >= startDate) {
      outboundDate.setTime(newOutbound.getTime())
    } else {
      // Can't fit, use minimum duration
      returnDate.setTime(outboundDate.getTime())
      returnDate.setDate(returnDate.getDate() + minDuration)
    }
  }
  
  // Format dates
  const outboundStr = outboundDate.toISOString().split("T")[0]
  const returnStr = returnDate.toISOString().split("T")[0]
  
  // Verify dates are valid
  if (outboundStr < input.start_date || returnStr > input.end_date || returnStr <= outboundStr) {
    // Fallback to start date + min duration
    const fallbackOutbound = new Date(input.start_date)
    const fallbackReturn = new Date(fallbackOutbound)
    fallbackReturn.setDate(fallbackReturn.getDate() + minDuration)
    
    return [{
      outbound_date: fallbackOutbound.toISOString().split("T")[0],
      return_date: fallbackReturn.toISOString().split("T")[0],
      reasoning: `Fallback: Using start date with ${minDuration}-day trip duration`,
      priority: 5,
    }]
  }
  
  return [{
    outbound_date: outboundStr,
    return_date: returnStr,
    reasoning: `Mid-week departure (Tuesday) with ${avgDuration}-day trip duration`,
    priority: 10,
  }]
}


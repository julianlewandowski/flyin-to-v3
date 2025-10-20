import { generateText } from "ai"
import type { AIDiscoveryResult } from "./types"

export interface AIScoutParams {
  origins: string[]
  destinations?: string[]
  startDate: string
  endDate: string
  tripDurationMin: number
  tripDurationMax: number
  budget?: number
  preferredWeekdays?: string[]
  maxLayovers?: number
}

export async function discoverRoutes(params: AIScoutParams): Promise<AIDiscoveryResult[]> {
  const { origins, destinations, startDate, endDate, tripDurationMin, tripDurationMax, budget, preferredWeekdays } =
    params

  // Build the search query for AI
  const originsText = origins.join(", ")
  const destinationsText = destinations?.length ? `to ${destinations.join(", ")}` : "to flexible destinations"
  const dateRange = `between ${startDate} and ${endDate}`
  const duration = `for ${tripDurationMin}-${tripDurationMax} days`
  const budgetText = budget ? `under €${budget}` : ""
  const weekdaysText = preferredWeekdays?.length ? `preferring ${preferredWeekdays.join(", ")}` : ""

  const prompt = `You are a flight deal expert. Search for the best cheap flight deals from ${originsText} ${destinationsText} ${dateRange} ${duration} ${budgetText} ${weekdaysText}.

Find the top 10 best flight deals by searching popular travel sites like Google Flights, Skyscanner, Momondo, and Reddit r/traveldeals.

For each deal, provide:
- Origin airport code (IATA)
- Destination airport code (IATA)
- Departure date (YYYY-MM-DD)
- Return date (YYYY-MM-DD)
- Estimated price in EUR
- Confidence score (0-1)

Return ONLY a valid JSON array with this exact structure:
[
  {
    "origin": "DUB",
    "destination": "BKK",
    "depart": "2025-07-03",
    "return": "2025-07-14",
    "estimated_price": 450,
    "confidence": 0.85
  }
]

Important:
- Only include real, bookable routes
- Prioritize the cheapest options
- Ensure dates fall within the specified range
- Trip duration must be between ${tripDurationMin} and ${tripDurationMax} days
- Return ONLY the JSON array, no other text`

  try {
    const { text } = await generateText({
      model: "openai/gpt-4o-mini",
      prompt,
      temperature: 0.3,
    })

    // Parse the JSON response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error("[v0] AI response did not contain valid JSON array")
      return []
    }

    const results: AIDiscoveryResult[] = JSON.parse(jsonMatch[0])

    // Validate and filter results
    return results.filter((r) => r.origin && r.destination && r.depart && r.return).slice(0, 10)
  } catch (error) {
    console.error("[v0] Error in AI route discovery:", error)
    return []
  }
}

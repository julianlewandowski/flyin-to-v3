/**
 * Destination Discovery Service
 * 
 * Uses OpenAI to discover recommended destinations based on user preferences.
 * Ported from backend/app/services/destination_discovery.py
 */

import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { createLogger } from "@/lib/utils/logger"

const logger = createLogger("DestinationDiscovery")

// Fallback destinations if OpenAI fails or returns fewer than 5
const FALLBACK_DESTINATIONS: DestinationItem[] = [
  { city: "Bangkok", country: "Thailand", airport: "BKK", reason: "Popular budget-friendly destination with great food and culture" },
  { city: "Barcelona", country: "Spain", airport: "BCN", reason: "Beautiful Mediterranean city with beaches and architecture" },
  { city: "Tokyo", country: "Japan", airport: "NRT", reason: "Unique blend of traditional and modern culture" },
  { city: "Dubai", country: "United Arab Emirates", airport: "DXB", reason: "Luxury destination with modern attractions" },
  { city: "Bali", country: "Indonesia", airport: "DPS", reason: "Tropical paradise with stunning beaches and temples" },
]

export interface DestinationItem {
  city: string
  country: string
  airport: string
  reason: string
}

export interface DiscoverDestinationsInput {
  origins: string[]
  dateRange: { start: string; end: string }
  tripLengths: { min: number; max: number }
  preferences?: {
    budget?: number
    preferred_weekdays?: string[]
    max_layovers?: number
  } | null
  prompt?: string | null
}

export interface DiscoverDestinationsResult {
  destinations: DestinationItem[]
}

/**
 * Discover 5 recommended destinations using OpenAI.
 */
export async function discoverDestinations(
  input: DiscoverDestinationsInput
): Promise<DestinationItem[]> {
  const { origins, dateRange, tripLengths, preferences, prompt } = input

  // Check for OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    logger.warn("OpenAI API key not configured, using fallback destinations")
    return FALLBACK_DESTINATIONS.slice(0, 5)
  }

  // Build the prompt components
  const originsText = origins.join(", ")
  const dateText = `${dateRange.start} to ${dateRange.end}`
  const durationText = `${tripLengths.min} to ${tripLengths.max} days`

  let preferencesText = ""
  if (preferences) {
    if (preferences.budget) {
      preferencesText += `\n- Budget: €${preferences.budget}`
    }
    if (preferences.preferred_weekdays && preferences.preferred_weekdays.length > 0) {
      preferencesText += `\n- Preferred departure days: ${preferences.preferred_weekdays.join(", ")}`
    }
    if (preferences.max_layovers !== undefined) {
      preferencesText += `\n- Max layovers: ${preferences.max_layovers}`
    }
  }

  const promptText = prompt ? `\n- Holiday description: ${prompt}` : ""

  const systemPrompt = `You are an expert travel agent skilled at affordable flight discovery and destination matching.
You have extensive knowledge of global destinations, airport codes, and travel pricing patterns.
Your recommendations are based on real-world travel data and user preferences.`

  const userPrompt = `User information:
- Origin airports: ${originsText}
- Preferred travel dates: ${dateText}
- Trip length range: ${durationText}
- Travel preferences: ${preferencesText || "None specified"}${promptText}

TASK:
Recommend EXACTLY 5 destinations worldwide that best match the user's inputs.
For each destination, choose the **cheapest likely airport to fly into** in that region.

Consider:
- Budget constraints if specified
- Travel dates and seasonal pricing
- Trip duration preferences
- User's holiday description if provided
- Geographic diversity (don't recommend all destinations in the same region)
- Value for money (affordable but interesting destinations)

Return JSON with an array "destinations", where each item has:
{
  "city": "City name",
  "country": "Country name",
  "airport": "IATA code (3 letters)",
  "reason": "Why this destination matches the user's preferences"
}

IMPORTANT:
- Return EXACTLY 5 destinations
- Use valid IATA airport codes (3 letters)
- Choose airports that are typically cheaper to fly into
- Provide specific, personalized reasons for each recommendation
- Return ONLY valid JSON, no other text`

  try {
    logger.debug("Calling OpenAI for destination discovery", { origins: originsText })

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
    })

    // Parse JSON response
    const destinations = parseDestinationsResponse(text)

    if (destinations.length >= 5) {
      logger.info("Successfully discovered destinations", { count: destinations.length })
      return destinations.slice(0, 5)
    }

    // If we got fewer than 5, fill with fallbacks
    logger.warn(`Got ${destinations.length} destinations, filling with fallbacks`)
    return fillWithFallbacks(destinations, 5)
  } catch (error) {
    logger.error("Error in destination discovery, retrying with simpler prompt", error)

    // Retry with simpler prompt
    try {
      return await retryDiscovery(originsText, dateText, durationText, preferencesText, promptText)
    } catch (retryError) {
      logger.error("Retry also failed, using fallback destinations", retryError)
      return FALLBACK_DESTINATIONS.slice(0, 5)
    }
  }
}

/**
 * Parse the OpenAI response to extract destinations
 */
function parseDestinationsResponse(text: string): DestinationItem[] {
  try {
    // Try direct JSON parse first
    const result = JSON.parse(text)
    const destinations = result.destinations || []
    return validateDestinations(destinations)
  } catch {
    // Try to extract JSON from text if wrapped in markdown or other content
    const jsonMatch = text.match(/\{[\s\S]*"destinations"[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const result = JSON.parse(jsonMatch[0])
        const destinations = result.destinations || []
        return validateDestinations(destinations)
      } catch {
        // Fall through to return empty array
      }
    }
  }

  return []
}

/**
 * Validate and clean destination items
 */
function validateDestinations(destinations: unknown[]): DestinationItem[] {
  const valid: DestinationItem[] = []

  for (const dest of destinations) {
    if (
      typeof dest === "object" &&
      dest !== null &&
      "city" in dest &&
      "country" in dest &&
      "airport" in dest &&
      "reason" in dest
    ) {
      const d = dest as Record<string, unknown>
      const airportCode = String(d.airport).toUpperCase().trim()

      // Validate airport code: must be exactly 3 letters
      if (airportCode.length === 3 && /^[A-Z]+$/.test(airportCode)) {
        valid.push({
          city: String(d.city),
          country: String(d.country),
          airport: airportCode,
          reason: String(d.reason),
        })
      }
    }
  }

  return valid
}

/**
 * Fill destinations with fallbacks to reach target count
 */
function fillWithFallbacks(destinations: DestinationItem[], targetCount: number): DestinationItem[] {
  const result = [...destinations]
  const existingAirports = new Set(destinations.map((d) => d.airport))

  for (const fallback of FALLBACK_DESTINATIONS) {
    if (result.length >= targetCount) break
    if (!existingAirports.has(fallback.airport)) {
      result.push(fallback)
      existingAirports.add(fallback.airport)
    }
  }

  return result.slice(0, targetCount)
}

/**
 * Retry destination discovery with a simpler prompt
 */
async function retryDiscovery(
  originsText: string,
  dateText: string,
  durationText: string,
  preferencesText: string,
  promptText: string
): Promise<DestinationItem[]> {
  logger.debug("Retrying with simpler prompt")

  const simplePrompt = `Recommend 5 travel destinations from ${originsText} for dates ${dateText}, trip length ${durationText}.${promptText}

Return JSON: {"destinations": [{"city": "...", "country": "...", "airport": "XXX", "reason": "..."}]}`

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: simplePrompt,
    temperature: 0.5,
  })

  const destinations = parseDestinationsResponse(text)

  if (destinations.length >= 5) {
    return destinations.slice(0, 5)
  }

  return fillWithFallbacks(destinations, 5)
}

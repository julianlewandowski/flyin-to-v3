/**
 * SerpApi Google Flights Adapter
 * 
 * This module handles retrieval of flight data from Google Flights via SerpApi.
 * 
 * Setup:
 * 1. Sign up at https://serpapi.com/
 * 2. Get your API key from dashboard
 * 3. Add SERPAPI_KEY to .env.local
 * 
 * Documentation: https://serpapi.com/google-flights-api
 */

import type { SerpApiFlightSearchParams, SerpApiFlightResult } from "./types"

const SERPAPI_BASE_URL = "https://serpapi.com/search"

/**
 * Get SerpApi API key from environment variables
 */
function getApiKey(): string {
  const apiKey = process.env.SERPAPI_KEY
  if (!apiKey) {
    throw new Error("SERPAPI_KEY is not configured in environment variables")
  }
  return apiKey
}

/**
 * Search for flights using SerpApi Google Flights
 * 
 * @param params Search parameters
 * @returns Raw SerpApi response
 */
export async function searchFlights(params: SerpApiFlightSearchParams): Promise<SerpApiFlightResult> {
  const apiKey = getApiKey()

  // Build query parameters
  const searchParams = new URLSearchParams({
    api_key: apiKey,
    engine: params.engine || "google_flights",
    departure_id: params.departure_id,
    arrival_id: params.arrival_id,
    ...(params.outbound_date && { outbound_date: params.outbound_date }),
    ...(params.return_date && { return_date: params.return_date }),
    ...(params.currency && { currency: params.currency }),
    ...(params.hl && { hl: params.hl }),
    ...(params.adults && { adults: params.adults.toString() }),
    ...(params.children && { children: params.children.toString() }),
    ...(params.infants && { infants: params.infants.toString() }),
    ...(params.class && { class: params.class }),
    ...(params.sort_by && { sort_by: params.sort_by }),
    ...(params.num && { num: params.num.toString() }),
  })

  try {
    const response = await fetch(`${SERPAPI_BASE_URL}?${searchParams.toString()}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`SerpApi error: ${response.status} ${response.statusText}. ${errorText}`)
    }

    const data: SerpApiFlightResult = await response.json()

    // Check for SerpApi errors in response
    if (data.error) {
      throw new Error(`SerpApi API error: ${data.error}`)
    }

    return data
  } catch (error) {
    console.error("[SerpApi] Search error:", error)
    throw error
  }
}

/**
 * Search multiple routes in parallel
 * Useful for searching multiple destinations or date ranges
 * 
 * @param paramsArray Array of search parameters
 * @returns Array of results corresponding to each search
 */
export async function searchFlightsParallel(
  paramsArray: SerpApiFlightSearchParams[],
): Promise<Array<{ params: SerpApiFlightSearchParams; result: SerpApiFlightResult; error?: Error }>> {
  const promises = paramsArray.map(async (params) => {
    try {
      const result = await searchFlights(params)
      return { params, result }
    } catch (error) {
      console.error(`[SerpApi] Error searching ${params.departure_id} -> ${params.arrival_id}:`, error)
      return { params, result: {} as SerpApiFlightResult, error: error as Error }
    }
  })

  return Promise.all(promises)
}

/**
 * Generate multiple search parameters from holiday preferences
 * This creates parallel searches for:
 * - Multiple destinations
 * - Date range (if flexible dates)
 * - Multiple origins (if provided)
 * 
 * @param holiday Holiday object with search preferences
 * @returns Array of SerpApi search parameters
 */
export function generateSearchParams(holiday: {
  origin: string
  origins?: string[]
  destinations: string[]
  start_date: string
  end_date: string
  budget?: number | null
}): SerpApiFlightSearchParams[] {
  const origins = holiday.origins || [holiday.origin]
  const params: SerpApiFlightSearchParams[] = []

  for (const origin of origins) {
    for (const destination of holiday.destinations) {
      // For now, search exact dates. Later we can expand to date ranges
      params.push({
        engine: "google_flights",
        departure_id: origin,
        arrival_id: destination,
        outbound_date: holiday.start_date,
        return_date: holiday.end_date,
        currency: "EUR", // Default, can be made configurable
        adults: 1,
        sort_by: "best",
        num: 50, // Get more results for better filtering
      })
    }
  }

  return params
}


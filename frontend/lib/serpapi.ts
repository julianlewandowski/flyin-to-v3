/**
 * SerpApi Google Flights Adapter
 * Supports multi-key rotation: set SERPAPI_KEYS=key1,key2,key3 for automatic failover.
 * Falls back to single SERPAPI_KEY for backward compatibility.
 */

import type { SerpApiFlightSearchParams, SerpApiFlightResult } from "./types"

const SERPAPI_BASE_URL = "https://serpapi.com/search"

/**
 * Returns all configured SerpAPI keys.
 * Reads SERPAPI_KEYS (comma-separated) first, falls back to single SERPAPI_KEY.
 */
function getApiKeys(): string[] {
  const multiKeys = process.env.SERPAPI_KEYS
  if (multiKeys) {
    const keys = multiKeys.split(",").map(k => k.trim()).filter(Boolean)
    if (keys.length > 0) return keys
  }
  const singleKey = process.env.SERPAPI_KEY
  if (singleKey) return [singleKey]
  return []
}

/** Returns true if at least one SerpAPI key is configured. */
export function hasSerpApiKeys(): boolean {
  return getApiKeys().length > 0
}

/**
 * Tracks keys that returned rate-limit errors during this serverless instance's lifetime.
 * Resets automatically on cold start.
 */
const exhaustedKeys = new Set<string>()

/** Returns true if the response indicates a temporary rate limit (429). */
function isTemporaryRateLimit(status: number, body: string): boolean {
  if (status === 429) return true
  const lower = body.toLowerCase()
  return (
    lower.includes("rate limit") ||
    lower.includes("too many requests")
  )
}

/** Returns true if the response indicates a permanent quota exhaustion (402/403). */
function isQuotaExhausted(status: number, body: string): boolean {
  if (status === 402) return true
  const lower = body.toLowerCase()
  return (
    lower.includes("quota") ||
    lower.includes("payment required") ||
    lower.includes("plan limit") ||
    (lower.includes("exceeded") && lower.includes("search")) // "Search quota exceeded" vs "Rate limit exceeded"
  )
}

export async function searchFlights(params: SerpApiFlightSearchParams): Promise<SerpApiFlightResult> {
  const keys = getApiKeys()
  if (keys.length === 0) {
    throw new Error("SERPAPI_KEYS is not configured in environment variables")
  }

  // Build URL params once (without api_key)
  const baseParams = new URLSearchParams({
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
    ...(params.sort_by && { sort_by: params.sort_by.toString() }),
    ...(params.num && { num: params.num.toString() }),
  })

  console.log("[SerpApi] Search params:", {
    engine: params.engine,
    departure_id: params.departure_id,
    arrival_id: params.arrival_id,
    outbound_date: params.outbound_date,
    return_date: params.return_date,
  })

  // Order keys: try non-exhausted first, then exhausted as fallback
  const orderedKeys = [
    ...keys.filter(k => !exhaustedKeys.has(k)),
    ...keys.filter(k => exhaustedKeys.has(k)),
  ]

  let quotaErrorHit = false

  for (let i = 0; i < orderedKeys.length; i++) {
    const apiKey = orderedKeys[i]
    const keyIndex = keys.indexOf(apiKey) + 1
    const keyLabel = `key${keyIndex}/${keys.length}`

    try {
      const searchParams = new URLSearchParams(baseParams)
      searchParams.set("api_key", apiKey)

      const url = `${SERPAPI_BASE_URL}?${searchParams.toString()}`
      console.log(`[SerpApi] [${keyLabel}] Making request to:`, url.replace(/api_key=[^&]+/, "api_key=***"))

      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      })

      console.log(`[SerpApi] [${keyLabel}] Response status:`, response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[SerpApi] [${keyLabel}] Error response body:`, errorText)

        if (isTemporaryRateLimit(response.status, errorText)) {
          console.warn(`[SerpApi] [${keyLabel}] Rate limit hit (temporary), rotating to next key...`)
          exhaustedKeys.add(apiKey)
          continue
        }

        if (isQuotaExhausted(response.status, errorText)) {
          console.warn(`[SerpApi] [${keyLabel}] Quota exhausted (permanent), rotating to next key...`)
          exhaustedKeys.add(apiKey)
          quotaErrorHit = true
          continue
        }

        // Non-rate-limit error (401, 400, etc.) — throw immediately, don't rotate
        throw new Error(`SerpApi error: ${response.status} ${response.statusText}. ${errorText}`)
      }

      const data: SerpApiFlightResult = await response.json()

      if (data.error) {
        const errorStr = typeof data.error === "string" ? data.error : JSON.stringify(data.error)
        
        if (isTemporaryRateLimit(200, errorStr)) {
          console.warn(`[SerpApi] [${keyLabel}] Rate limit in response body, rotating to next key...`)
          exhaustedKeys.add(apiKey)
          continue
        }

        if (isQuotaExhausted(200, errorStr)) {
          console.warn(`[SerpApi] [${keyLabel}] Quota exhausted in response body, rotating to next key...`)
          exhaustedKeys.add(apiKey)
          quotaErrorHit = true
          continue
        }

        console.error(`[SerpApi] [${keyLabel}] API returned error in response:`, data.error)
        throw new Error(`SerpApi API error: ${data.error}`)
      }

      // Success — log and return
      console.log(`[SerpApi] [${keyLabel}] Response keys:`, Object.keys(data))
      console.log(`[SerpApi] [${keyLabel}] Has best_flights:`, !!data.best_flights)
      console.log(`[SerpApi] [${keyLabel}] Has other_flights:`, !!data.other_flights)
      console.log(`[SerpApi] [${keyLabel}] Has flights:`, !!data.flights)

      const flightCount = (data.best_flights?.length || 0) + (data.other_flights?.length || 0) + (data.flights?.length || 0)
      console.log(`[SerpApi] [${keyLabel}] Total flights found:`, flightCount)

      return data
    } catch (error) {
      // Re-throw non-rate-limit errors immediately
      if (error instanceof Error && 
          !error.message.includes("rate limit") && 
          !error.message.includes("Rate limit") &&
          !error.message.includes("quota") &&
          !error.message.includes("Quota")) {
        console.error(`[SerpApi] [${keyLabel}] Search error:`, error.message)
        console.error(`[SerpApi] [${keyLabel}] Error stack:`, error.stack)
        throw error
      }
      // Rate-limit/Quota errors from catch: mark exhausted and continue
      exhaustedKeys.add(apiKey)
      if (error instanceof Error && (error.message.includes("quota") || error.message.includes("Quota"))) {
        quotaErrorHit = true
      }
      console.warn(`[SerpApi] [${keyLabel}] Key exhausted, trying next...`)
    }
  }

  // All keys exhausted
  if (quotaErrorHit) {
    throw new Error(
      `SerpApi quota: all ${keys.length} API keys exhausted (quota limit reached). ` +
      `Please upgrade your plan or add more keys.`
    )
  }

  throw new Error(
    `SerpApi rate limit: all ${keys.length} API keys exhausted (temporary rate limit). ` +
    `Please wait a moment and try again.`
  )
}

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
 * Generate search params for SerpAPI
 * Handles multiple origins, destinations, AI discovery results, and date validation
 */
export function generateSearchParams(holiday: {
  origin?: string
  origins?: string[]
  destinations?: string[]
  ai_discovery_results?: Array<{
    origin: string
    destination: string
    depart: string
    return: string
    estimated_price?: number
    confidence?: number
  }>
  start_date?: string
  end_date?: string
  budget?: number | null
}): SerpApiFlightSearchParams[] {
  console.log("[generateSearchParams] Starting with holiday data:", {
    origin: holiday.origin,
    origins: holiday.origins,
    destinations: holiday.destinations,
    start_date: holiday.start_date,
    end_date: holiday.end_date,
    has_ai_results: !!holiday.ai_discovery_results?.length,
    ai_results_count: holiday.ai_discovery_results?.length || 0,
  })

  // Step 1: Collect origins
  const origins: string[] = []
  if (holiday.origins && holiday.origins.length > 0) {
    origins.push(...holiday.origins.filter((o) => o && o.trim()))
  } else if (holiday.origin && holiday.origin.trim()) {
    origins.push(holiday.origin.trim())
  }

  console.log("[generateSearchParams] Collected origins:", origins)

  if (origins.length === 0) {
    console.error("[generateSearchParams] ERROR: No origins found in holiday data")
    throw new Error("No origins found in holiday data. Please provide at least one origin airport.")
  }

  // Step 2: Collect destinations and dates from multiple sources
  const searchConfigs: Array<{
    origin: string
    destination: string
    outbound_date: string
    return_date: string
  }> = []

  // Option A: Use AI discovery results if available
  if (holiday.ai_discovery_results && holiday.ai_discovery_results.length > 0) {
    console.log("[generateSearchParams] Using AI discovery results:", holiday.ai_discovery_results.length, "routes")
    
    for (const aiResult of holiday.ai_discovery_results) {
      if (!aiResult.origin || !aiResult.destination || !aiResult.depart || !aiResult.return) {
        console.warn("[generateSearchParams] Skipping incomplete AI result:", aiResult)
        continue
      }

      // For each origin in holiday, pair with AI-discovered destinations
      for (const origin of origins) {
        searchConfigs.push({
          origin: origin.trim(),
          destination: aiResult.destination.trim(),
          outbound_date: aiResult.depart,
          return_date: aiResult.return,
        })
      }
    }
  }

  // Option B: Use regular destinations array
  if (holiday.destinations && holiday.destinations.length > 0) {
    console.log("[generateSearchParams] Using destinations array:", holiday.destinations.length, "destinations")
    
    if (!holiday.start_date || !holiday.end_date) {
      console.error("[generateSearchParams] ERROR: Destinations provided but dates are missing")
      throw new Error("Start date and end date are required when destinations are specified")
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(holiday.start_date) || !dateRegex.test(holiday.end_date)) {
      console.error("[generateSearchParams] ERROR: Invalid date format. Expected YYYY-MM-DD")
      throw new Error("Invalid date format. Expected YYYY-MM-DD format")
    }

    // Validate date logic
    const startDate = new Date(holiday.start_date)
    const endDate = new Date(holiday.end_date)
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error("[generateSearchParams] ERROR: Invalid dates cannot be parsed")
      throw new Error("Invalid dates provided")
    }

    if (startDate >= endDate) {
      console.error("[generateSearchParams] ERROR: Start date must be before end date")
      throw new Error("Start date must be before end date")
    }

    const validDestinations = holiday.destinations.filter((d) => d && d.trim())
    
    for (const origin of origins) {
      for (const destination of validDestinations) {
        searchConfigs.push({
          origin: origin.trim(),
          destination: destination.trim(),
          outbound_date: holiday.start_date,
          return_date: holiday.end_date,
        })
      }
    }
  }

  console.log("[generateSearchParams] Generated search configs:", searchConfigs.length)

  if (searchConfigs.length === 0) {
    console.error("[generateSearchParams] ERROR: No valid search configurations generated")
    throw new Error(
      "No valid search configurations. Please provide destinations or run AI discovery first."
    )
  }

  // Step 3: Convert to SerpAPI params
  const params: SerpApiFlightSearchParams[] = []

  for (const config of searchConfigs) {
    // Ensure dates are in correct format for SerpAPI
    const outboundDate = config.outbound_date.split("T")[0] // Remove time if present
    const returnDate = config.return_date.split("T")[0]

    params.push({
      engine: "google_flights",
      departure_id: config.origin,
      arrival_id: config.destination,
      outbound_date: outboundDate,
      return_date: returnDate,
      currency: "EUR",
      adults: 1,
      sort_by: 1, // 1 = Top flights (default, closest to "best")
      num: 50,
    })
  }

  console.log("[generateSearchParams] Final params generated:", params.length)
  console.log("[generateSearchParams] Sample params:", params.slice(0, 3))

  return params
}

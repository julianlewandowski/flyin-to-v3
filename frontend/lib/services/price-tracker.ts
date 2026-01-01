/**
 * Price Tracker Service
 * 
 * Daily price-check job for tracked holidays.
 * 
 * This service:
 * 1. Queries holidays with price_tracking_enabled = true
 * 2. Re-runs flight searches using existing SerpAPI integration
 * 3. Compares prices against last_tracked_price
 * 4. Creates price_drop_alerts when threshold is exceeded
 * 
 * Ported from backend/app/services/price_tracker.py
 */

import { createClient } from "@/lib/supabase/server"
import { searchFlightsParallel, type SerpApiFlightSearchParams } from "@/lib/serpapi"
import { normalizeFlightOffers, extractFlightsFromSerpApiResponse } from "@/lib/normalize-flights"
import { expandCityAirport } from "@/lib/airports"
import { generateFlexibleDateCandidates } from "@/lib/flexible-date-explorer"
import { filterDateCandidates } from "@/lib/llm-candidate-filter"
import { createLogger } from "@/lib/utils/logger"
import type { Holiday, FlightOffer } from "@/lib/types"
import type { SupabaseClient } from "@supabase/supabase-js"

const logger = createLogger("PriceTracker")

// ============================================================================
// Types
// ============================================================================

export interface PriceCheckResult {
  success: boolean
  holidaysChecked: number
  alertsCreated: number
  errors: number
  details: HolidayCheckResult[]
}

export interface HolidayCheckResult {
  success: boolean
  holidayId: string
  holidayName?: string
  newPrice?: number | null
  oldPrice?: number
  alertCreated: boolean
  error?: string
  message?: string
}

// ============================================================================
// Utility Functions
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Search with exponential backoff retry
 */
async function searchWithRetry(
  params: SerpApiFlightSearchParams[],
  retries = 3
): Promise<Awaited<ReturnType<typeof searchFlightsParallel>>> {
  for (let i = 0; i < retries; i++) {
    try {
      return await searchFlightsParallel(params)
    } catch (error) {
      if (i === retries - 1) throw error
      const delay = Math.pow(2, i) * 1000
      logger.warn(`SerpAPI call failed, retrying in ${delay}ms...`, { attempt: i + 1 })
      await sleep(delay)
    }
  }
  throw new Error("Max retries exceeded")
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Run a price check for a single holiday.
 */
async function runPriceCheckForHoliday(
  holiday: Holiday,
  supabase: SupabaseClient
): Promise<HolidayCheckResult> {
  const holidayId = holiday.id
  const holidayName = holiday.name || "Unknown"
  const lastTrackedPrice = holiday.last_tracked_price || 0
  const thresholdPercent = holiday.price_drop_threshold_percent || 10.0

  logger.info(`Checking holiday: ${holidayName}`, {
    holidayId,
    lastTrackedPrice,
    thresholdPercent,
  })

  try {
    // Collect origins
    const origins: string[] = []
    if (holiday.origins && holiday.origins.length > 0) {
      for (const origin of holiday.origins.filter((o) => o && o.trim())) {
        const expanded = expandCityAirport(origin.trim())
        origins.push(...expanded)
      }
    } else if (holiday.origin && holiday.origin.trim()) {
      const expanded = expandCityAirport(holiday.origin.trim())
      origins.push(...expanded)
    }

    if (origins.length === 0) {
      return {
        success: false,
        holidayId,
        holidayName,
        alertCreated: false,
        error: "No origins configured",
      }
    }

    // Collect destinations
    const destinations: string[] = []
    for (const dest of holiday.destinations || []) {
      if (dest && dest.trim()) {
        const expanded = expandCityAirport(dest.trim())
        destinations.push(...expanded)
      }
    }

    if (destinations.length === 0) {
      return {
        success: false,
        holidayId,
        holidayName,
        alertCreated: false,
        error: "No destinations configured",
      }
    }

    // Get trip duration settings
    const tripDurationMin = holiday.trip_duration_min || 3
    const tripDurationMax = holiday.trip_duration_max || 14

    // Generate date candidates using flexible date explorer
    const dateCandidates = generateFlexibleDateCandidates({
      start_date: holiday.start_date,
      end_date: holiday.end_date,
      trip_length_min: tripDurationMin,
      trip_length_max: tripDurationMax,
      target_candidates: 10, // Generate fewer candidates for price check to save API quota
    })

    if (dateCandidates.length === 0) {
      // Update last check time even if no dates
      await supabase
        .from("holidays")
        .update({ last_price_check: new Date().toISOString() })
        .eq("id", holidayId)

      return {
        success: true,
        holidayId,
        holidayName,
        newPrice: null,
        oldPrice: lastTrackedPrice,
        alertCreated: false,
        message: "No valid date combinations found",
      }
    }

    // Filter date candidates to get top 3 for price check (save API quota)
    let filteredCandidates: Array<{
      depart_date: string
      return_date: string
      score: number
      reasoning: string
    }> = []

    try {
      filteredCandidates = await filterDateCandidates({
        candidates: dateCandidates,
        origin_airports: origins.slice(0, 2),
        destination_airports: destinations.slice(0, 2),
        start_date: holiday.start_date,
        end_date: holiday.end_date,
        trip_length_min: tripDurationMin,
        trip_length_max: tripDurationMax,
        budget: holiday.budget || undefined,
        preferences: {
          budget_sensitivity: "high",
          flexibility: "moderate",
          preferred_weekdays: holiday.preferred_weekdays,
        },
      })
    } catch (error) {
      logger.warn("Error filtering candidates, using first 3", { error: String(error) })
      // Fallback: use first 3 candidates
      filteredCandidates = dateCandidates.slice(0, 3).map((c) => ({
        depart_date: c.depart_date,
        return_date: c.return_date,
        score: 50,
        reasoning: "Fallback selection",
      }))
    }

    // Generate search params - limited to 3 calls to save API quota
    const MAX_PRICE_CHECK_CALLS = 3
    const searchParams: SerpApiFlightSearchParams[] = filteredCandidates
      .slice(0, MAX_PRICE_CHECK_CALLS)
      .map((datePair) => ({
        engine: "google_flights" as const,
        departure_id: origins[0],
        arrival_id: destinations[0],
        outbound_date: datePair.depart_date,
        return_date: datePair.return_date,
        currency: "EUR",
        adults: 1,
        sort_by: 1,
        num: 20, // Fewer results needed for price check
      }))

    logger.info(`Running ${searchParams.length} searches for ${holidayName}`)

    // Run searches with retry
    const searchResults = await searchWithRetry(searchParams)

    // Collect and normalize results
    const allRawFlights: unknown[] = []
    for (const res of searchResults) {
      if (res.error) {
        continue
      }
      if (res.result) {
        const flights = extractFlightsFromSerpApiResponse(res.result)
        allRawFlights.push(...flights)
      }
    }

    if (allRawFlights.length === 0) {
      logger.info(`No flights found for ${holidayName}`)
      
      // Update last check time even if no results
      await supabase
        .from("holidays")
        .update({ last_price_check: new Date().toISOString() })
        .eq("id", holidayId)

      return {
        success: true,
        holidayId,
        holidayName,
        newPrice: null,
        oldPrice: lastTrackedPrice,
        alertCreated: false,
        message: "No flights found",
      }
    }

    // Normalize results
    const normalized = normalizeFlightOffers(allRawFlights, "serpapi", "EUR")

    if (normalized.length === 0) {
      return {
        success: false,
        holidayId,
        holidayName,
        alertCreated: false,
        error: "Could not normalize flight data",
      }
    }

    // Get lowest price from normalized offers
    const lowestPrice = Math.min(
      ...normalized
        .filter((offer: FlightOffer) => offer.price?.total)
        .map((offer: FlightOffer) => offer.price.total)
    )

    logger.info(`Found lowest price: €${lowestPrice.toFixed(2)} (was €${lastTrackedPrice.toFixed(2)})`)

    // Calculate price drop
    let alertCreated = false
    if (lastTrackedPrice > 0 && lowestPrice < lastTrackedPrice) {
      const percentDrop = ((lastTrackedPrice - lowestPrice) / lastTrackedPrice) * 100

      logger.info(`Price dropped by ${percentDrop.toFixed(1)}%`)

      if (percentDrop >= thresholdPercent) {
        // Find cheapest offer for alert details
        const cheapestOffer = normalized.reduce(
          (min: FlightOffer, offer: FlightOffer) =>
            (offer.price?.total || Infinity) < (min.price?.total || Infinity) ? offer : min,
          normalized[0]
        )

        let routeInfo: Record<string, unknown> | null = null
        let dateInfo: Record<string, unknown> | null = null

        if (cheapestOffer.segments && cheapestOffer.segments.length > 0) {
          const firstSeg = cheapestOffer.segments[0]
          const lastSeg = cheapestOffer.segments[cheapestOffer.segments.length - 1]

          routeInfo = {
            origin: firstSeg.from?.code || firstSeg.from_airport?.code,
            destination: lastSeg.to?.code || lastSeg.to_airport?.code,
          }

          dateInfo = {
            departure_date: firstSeg.departure?.substring(0, 10),
            return_date: lastSeg.arrival?.substring(0, 10),
          }
        }

        // Create price drop alert
        const alertData = {
          holiday_id: holidayId,
          old_price: lastTrackedPrice,
          new_price: lowestPrice,
          percent_drop: Math.round(percentDrop * 100) / 100,
          route_info: routeInfo,
          date_info: dateInfo,
          resolved: false,
          notified: false,
          created_at: new Date().toISOString(),
        }

        await supabase.from("price_drop_alerts").insert(alertData)

        // Update holiday with active alert flag
        await supabase
          .from("holidays")
          .update({
            last_tracked_price: lowestPrice,
            has_active_price_alert: true,
            last_price_check: new Date().toISOString(),
          })
          .eq("id", holidayId)

        alertCreated = true
        logger.info(
          `Alert created! Price dropped ${percentDrop.toFixed(1)}% from €${lastTrackedPrice.toFixed(2)} to €${lowestPrice.toFixed(2)}`
        )
      } else {
        // Price dropped but not enough to trigger alert
        await supabase
          .from("holidays")
          .update({
            last_tracked_price: lowestPrice,
            last_price_check: new Date().toISOString(),
          })
          .eq("id", holidayId)
      }
    } else {
      // No price drop or price increased
      await supabase
        .from("holidays")
        .update({
          last_tracked_price: lowestPrice,
          last_price_check: new Date().toISOString(),
        })
        .eq("id", holidayId)
    }

    return {
      success: true,
      holidayId,
      holidayName,
      newPrice: lowestPrice,
      oldPrice: lastTrackedPrice,
      alertCreated,
    }
  } catch (error) {
    logger.error(`Error checking ${holidayName}`, error, { holidayId })
    return {
      success: false,
      holidayId,
      holidayName,
      alertCreated: false,
      error: String(error),
    }
  }
}

/**
 * Main entry point for the daily price check job.
 * 
 * Queries all holidays with tracking enabled and checks prices.
 */
export async function runDailyPriceCheck(): Promise<PriceCheckResult> {
  logger.info("========================================")
  logger.info("Starting daily price check job")
  logger.info(`Time: ${new Date().toISOString()}`)
  logger.info("========================================")

  const supabase = await createClient()

  // Get all holidays with tracking enabled
  const { data: holidays, error: queryError } = await supabase
    .from("holidays")
    .select("*")
    .eq("price_tracking_enabled", true)

  if (queryError) {
    logger.error("Error querying holidays", queryError)
    return {
      success: false,
      holidaysChecked: 0,
      alertsCreated: 0,
      errors: 1,
      details: [],
    }
  }

  if (!holidays || holidays.length === 0) {
    logger.info("No holidays with tracking enabled")
    return {
      success: true,
      holidaysChecked: 0,
      alertsCreated: 0,
      errors: 0,
      details: [],
    }
  }

  logger.info(`Found ${holidays.length} holidays to check`)

  const results: HolidayCheckResult[] = []

  // Process holidays sequentially to avoid rate limits
  for (const holiday of holidays) {
    const result = await runPriceCheckForHoliday(holiday as Holiday, supabase)
    results.push(result)

    // Small delay between holidays to avoid rate limits
    await sleep(1000)
  }

  const alertsCreated = results.filter((r) => r.alertCreated).length
  const errors = results.filter((r) => !r.success).length

  logger.info("========================================")
  logger.info(`Completed: ${holidays.length} checked, ${alertsCreated} alerts, ${errors} errors`)
  logger.info("========================================")

  return {
    success: true,
    holidaysChecked: holidays.length,
    alertsCreated,
    errors,
    details: results,
  }
}

/**
 * Check if a holiday has already been processed today (idempotency).
 * 
 * This prevents duplicate processing if the cron job runs multiple times
 * or if there's a retry.
 */
export async function hasBeenProcessedToday(
  holidayId: string,
  supabase: SupabaseClient
): Promise<boolean> {
  const today = new Date().toISOString().split("T")[0]
  
  const { data: holiday } = await supabase
    .from("holidays")
    .select("last_price_check")
    .eq("id", holidayId)
    .single()

  if (!holiday?.last_price_check) {
    return false
  }

  const lastCheck = holiday.last_price_check.split("T")[0]
  return lastCheck === today
}

/**
 * Run price check for a single holiday (used for manual triggers).
 * 
 * Includes idempotency check.
 */
export async function runPriceCheckForSingleHoliday(
  holidayId: string,
  force = false
): Promise<HolidayCheckResult> {
  const supabase = await createClient()

  // Idempotency check
  if (!force && await hasBeenProcessedToday(holidayId, supabase)) {
    logger.info(`Holiday ${holidayId} already checked today, skipping`)
    return {
      success: true,
      holidayId,
      alertCreated: false,
      message: "Already checked today",
    }
  }

  // Fetch holiday
  const { data: holiday, error } = await supabase
    .from("holidays")
    .select("*")
    .eq("id", holidayId)
    .single()

  if (error || !holiday) {
    return {
      success: false,
      holidayId,
      alertCreated: false,
      error: "Holiday not found",
    }
  }

  if (!holiday.price_tracking_enabled) {
    return {
      success: false,
      holidayId,
      alertCreated: false,
      error: "Price tracking not enabled for this holiday",
    }
  }

  return runPriceCheckForHoliday(holiday as Holiday, supabase)
}

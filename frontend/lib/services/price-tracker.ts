/**
 * Price Tracker Service
 * 
 * Daily price-check job for tracked holidays.
 * 
 * This service:
 * 1. Queries holidays with price_tracking_enabled = true
 * 2. Re-runs flight searches using existing SerpAPI integration
 * 3. Compares prices against baseline_price
 * 4. Creates price_drop_alerts when threshold is exceeded
 * 
 * Ported from backend/app/services/price_tracker.py
 */

import { createAdminClient } from "@/lib/supabase/admin"
import { searchFlightsParallel, type SerpApiFlightSearchParams } from "@/lib/serpapi"
import { normalizeFlightOffers, extractFlightsFromSerpApiResponse } from "@/lib/normalize-flights"
import { expandCityAirport } from "@/lib/airports"
import { generateFlexibleDateCandidates } from "@/lib/flexible-date-explorer"
import { filterDateCandidates } from "@/lib/llm-candidate-filter"
import { createLogger } from "@/lib/utils/logger"
import {
  sendPriceDropAlert,
  sendTrackingDisabledEmail,
  sendEmailWithRetry,
  sendDeveloperAlert,
} from "@/lib/services/email"
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
  oldPrice?: number | null
  alertCreated: boolean
  disabledDueToInactivity?: boolean
  disabledDueToFailures?: boolean
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

/**
 * Get user email from Supabase Auth using the admin client.
 */
async function getUserEmail(
  userId: string,
  supabase: SupabaseClient
): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId)

    if (error || !data?.user?.email) {
      logger.warn("Could not get user email", { userId, error: error?.message })
      return null
    }

    return data.user.email
  } catch (err) {
    logger.error("Exception getting user email", err, { userId })
    return null
  }
}

/**
 * Handle a scan failure by incrementing consecutive_failures.
 * If failures reach the threshold, disable tracking and notify user.
 *
 * @returns true if tracking was disabled due to too many failures
 */
const MAX_CONSECUTIVE_FAILURES = 3

async function handleScanFailure(
  holiday: Holiday,
  supabase: SupabaseClient,
  failureReason: string
): Promise<{ trackingDisabled: boolean; newFailureCount: number }> {
  const holidayId = holiday.id
  const holidayName = holiday.name || "Unknown"
  const currentFailures = holiday.consecutive_failures || 0
  const newFailureCount = currentFailures + 1

  logger.warn(`Scan failure for ${holidayName}: ${failureReason}`, {
    holidayId,
    consecutiveFailures: newFailureCount,
    maxFailures: MAX_CONSECUTIVE_FAILURES,
  })

  if (newFailureCount >= MAX_CONSECUTIVE_FAILURES) {
    // Too many failures - disable tracking
    logger.info(`Disabling tracking for ${holidayName} after ${newFailureCount} consecutive failures`, {
      holidayId,
    })

    await supabase
      .from("holidays")
      .update({
        price_tracking_enabled: false,
        tracking_disabled_reason: "failures",
        consecutive_failures: newFailureCount,
        last_price_check: new Date().toISOString(),
      })
      .eq("id", holidayId)

    // Notify user
    const userEmail = await getUserEmail(holiday.user_id, supabase)
    if (userEmail) {
      await sendTrackingDisabledEmail({
        to: userEmail,
        holidayId,
        holidayName,
        reason: "failures",
      })
    }

    return { trackingDisabled: true, newFailureCount }
  }

  // Increment failure count but keep tracking enabled
  await supabase
    .from("holidays")
    .update({
      consecutive_failures: newFailureCount,
      last_price_check: new Date().toISOString(),
    })
    .eq("id", holidayId)

  return { trackingDisabled: false, newFailureCount }
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
  const baselinePrice = holiday.baseline_price ?? holiday.last_tracked_price // Support both old and new column names
  const thresholdPercent = holiday.price_drop_threshold_percent || 10.0

  logger.info(`Checking holiday: ${holidayName}`, {
    holidayId,
    baselinePrice: baselinePrice ?? "not set (first scan)",
    thresholdPercent,
  })

  // ========================================================================
  // INACTIVITY CHECK
  // ========================================================================
  // If user hasn't viewed this project in 7+ days, disable tracking
  const INACTIVITY_DAYS = 7
  const lastViewedAt = holiday.last_viewed_at ? new Date(holiday.last_viewed_at) : null
  const now = new Date()

  if (lastViewedAt) {
    const daysSinceView = (now.getTime() - lastViewedAt.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSinceView >= INACTIVITY_DAYS) {
      logger.info(`Holiday ${holidayName} inactive for ${daysSinceView.toFixed(1)} days - disabling tracking`, {
        holidayId,
        lastViewedAt: holiday.last_viewed_at,
      })

      // Disable tracking
      await supabase
        .from("holidays")
        .update({
          price_tracking_enabled: false,
          tracking_disabled_reason: "inactivity",
          last_price_check: now.toISOString(),
        })
        .eq("id", holidayId)

      // Notify user
      const userEmail = await getUserEmail(holiday.user_id, supabase)
      if (userEmail) {
        await sendTrackingDisabledEmail({
          to: userEmail,
          holidayId,
          holidayName,
          reason: "inactivity",
        })
      }

      return {
        success: true,
        holidayId,
        holidayName,
        alertCreated: false,
        disabledDueToInactivity: true,
        message: `Tracking disabled due to inactivity (${daysSinceView.toFixed(0)} days)`,
      }
    }
  }

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
        oldPrice: baselinePrice,
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
      // No flights found - track as failure
      const { trackingDisabled, newFailureCount } = await handleScanFailure(
        holiday,
        supabase,
        "No flights found from SerpAPI"
      )

      return {
        success: false,
        holidayId,
        holidayName,
        newPrice: null,
        oldPrice: baselinePrice,
        alertCreated: false,
        disabledDueToFailures: trackingDisabled,
        error: `No flights found (failure ${newFailureCount}/${MAX_CONSECUTIVE_FAILURES})`,
      }
    }

    // Normalize results
    const normalized = normalizeFlightOffers(allRawFlights, "serpapi", "EUR")

    if (normalized.length === 0) {
      // Normalization failure - track as failure
      const { trackingDisabled, newFailureCount } = await handleScanFailure(
        holiday,
        supabase,
        "Could not normalize flight data"
      )

      return {
        success: false,
        holidayId,
        holidayName,
        alertCreated: false,
        disabledDueToFailures: trackingDisabled,
        error: `Could not normalize flight data (failure ${newFailureCount}/${MAX_CONSECUTIVE_FAILURES})`,
      }
    }

    // Get lowest price from normalized offers
    const lowestPrice = Math.min(
      ...normalized
        .filter((offer: FlightOffer) => offer.price?.total)
        .map((offer: FlightOffer) => offer.price.total)
    )

    // ========================================================================
    // BASELINE LOGIC
    // ========================================================================
    // Rules:
    // 1. First scan (baseline is NULL): Set baseline, no alert
    // 2. Price drop >= 10% from baseline: Create alert, update baseline
    // 3. Price drop < 10% OR price increased: Do NOT update baseline
    // 4. Always update last_price_check timestamp
    // ========================================================================

    let alertCreated = false
    const now = new Date().toISOString()

    // CASE 1: First scan - establish baseline
    if (baselinePrice == null) {
      logger.info(`First scan for ${holidayName}: establishing baseline at €${lowestPrice.toFixed(2)}`)

      await supabase
        .from("holidays")
        .update({
          baseline_price: lowestPrice,
          baseline_set_at: now,
          last_price_found: lowestPrice,
          last_price_check: now,
          consecutive_failures: 0,
        })
        .eq("id", holidayId)

      return {
        success: true,
        holidayId,
        holidayName,
        newPrice: lowestPrice,
        oldPrice: undefined,
        alertCreated: false,
        message: "Baseline established",
      }
    }

    // CASE 2+3: Compare to existing baseline
    logger.info(`Found lowest price: €${lowestPrice.toFixed(2)} (baseline: €${baselinePrice.toFixed(2)})`)

    const priceDifference = baselinePrice - lowestPrice
    const percentDrop = (priceDifference / baselinePrice) * 100

    if (percentDrop >= thresholdPercent) {
      // CASE 2: Significant price drop - create alert and update baseline
      logger.info(`Price dropped by ${percentDrop.toFixed(1)}% (threshold: ${thresholdPercent}%)`)

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

      // Create price drop alert record first
      const alertData = {
        holiday_id: holidayId,
        old_price: baselinePrice,
        new_price: lowestPrice,
        percent_drop: Math.round(percentDrop * 100) / 100,
        route_info: routeInfo,
        date_info: dateInfo,
        resolved: false,
        notified: false,
        created_at: now,
      }

      const { data: insertedAlert, error: alertError } = await supabase
        .from("price_drop_alerts")
        .insert(alertData)
        .select("id")
        .single()

      if (alertError || !insertedAlert) {
        logger.error(`Failed to create alert for ${holidayName}`, alertError, { holidayId })
        await supabase
          .from("holidays")
          .update({ last_price_check: now })
          .eq("id", holidayId)

        return {
          success: false,
          holidayId,
          holidayName,
          alertCreated: false,
          error: `Failed to create alert: ${alertError?.message}`,
        }
      }

      // Get user email for notification
      const userEmail = await getUserEmail(holiday.user_id, supabase)

      if (!userEmail) {
        logger.warn(`No email found for user, cannot send notification`, {
          holidayId,
          userId: holiday.user_id,
        })
        // Update last_price_check but NOT baseline (user wasn't notified)
        await supabase
          .from("holidays")
          .update({
            last_price_check: now,
            last_price_found: lowestPrice,
            consecutive_failures: 0,
          })
          .eq("id", holidayId)

        return {
          success: true,
          holidayId,
          holidayName,
          newPrice: lowestPrice,
          oldPrice: baselinePrice,
          alertCreated: true,
          message: "Alert created but no email sent (user email not found)",
        }
      }

      // Send email with retry (max 2 attempts)
      const emailResult = await sendEmailWithRetry(
        () =>
          sendPriceDropAlert({
            to: userEmail,
            holidayId,
            holidayName,
            oldPrice: baselinePrice,
            newPrice: lowestPrice,
            percentDrop,
            route: routeInfo
              ? {
                  origin: routeInfo.origin as string | undefined,
                  destination: routeInfo.destination as string | undefined,
                }
              : undefined,
            dates: dateInfo
              ? {
                  departure: dateInfo.departure_date as string | undefined,
                  return: dateInfo.return_date as string | undefined,
                }
              : undefined,
          }),
        { holidayId, emailType: "price_drop_alert" }
      )

      if (emailResult.success) {
        // Email succeeded - update baseline and mark alert as notified
        logger.info(
          `Alert created and email sent! Price dropped ${percentDrop.toFixed(1)}% from €${baselinePrice.toFixed(2)} to €${lowestPrice.toFixed(2)}`
        )

        await Promise.all([
          // Update holiday with new baseline
          supabase
            .from("holidays")
            .update({
              baseline_price: lowestPrice,
              baseline_set_at: now,
              last_price_found: lowestPrice,
              has_active_price_alert: true,
              last_price_check: now,
              consecutive_failures: 0,
            })
            .eq("id", holidayId),
          // Mark alert as notified
          supabase
            .from("price_drop_alerts")
            .update({ notified: true })
            .eq("id", insertedAlert.id),
        ])

        alertCreated = true
      } else {
        // Email failed - do NOT update baseline, keep alert for retry
        logger.warn(
          `Alert created but email failed. Baseline NOT updated. Will retry on next scan.`,
          { holidayId, error: emailResult.error }
        )

        await supabase
          .from("holidays")
          .update({
            last_price_check: now,
            last_price_found: lowestPrice,
            has_active_price_alert: true,
            consecutive_failures: 0,
          })
          .eq("id", holidayId)

        alertCreated = true // Alert was created, just not notified
      }
    } else {
      // CASE 3: No significant drop - keep baseline unchanged
      if (percentDrop > 0) {
        logger.info(`Price dropped by ${percentDrop.toFixed(1)}% (below ${thresholdPercent}% threshold) - baseline unchanged`)
      } else if (percentDrop < 0) {
        logger.info(`Price increased by ${Math.abs(percentDrop).toFixed(1)}% - baseline unchanged`)
      } else {
        logger.info(`Price unchanged at €${lowestPrice.toFixed(2)}`)
      }

      // Only update last_price_check and last_price_found, NOT the baseline
      await supabase
        .from("holidays")
        .update({
          last_price_check: now,
          last_price_found: lowestPrice,
          consecutive_failures: 0, // Reset on successful scan
        })
        .eq("id", holidayId)
    }

    return {
      success: true,
      holidayId,
      holidayName,
      newPrice: lowestPrice,
      oldPrice: baselinePrice,
      alertCreated,
    }
  } catch (error) {
    logger.error(`Error checking ${holidayName}`, error, { holidayId })

    // Track the failure
    const { trackingDisabled, newFailureCount } = await handleScanFailure(
      holiday,
      supabase,
      String(error)
    )

    return {
      success: false,
      holidayId,
      holidayName,
      alertCreated: false,
      disabledDueToFailures: trackingDisabled,
      error: `${String(error)} (failure ${newFailureCount}/${MAX_CONSECUTIVE_FAILURES})`,
    }
  }
}

/**
 * Retry sending emails for alerts that weren't notified.
 * Called at the start of each cron run to catch up on failed deliveries.
 */
async function retryUnnotifiedAlerts(supabase: SupabaseClient): Promise<number> {
  // Find alerts created more than 1 hour ago that haven't been notified
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { data: pendingAlerts, error } = await supabase
    .from("price_drop_alerts")
    .select(`
      id,
      holiday_id,
      old_price,
      new_price,
      percent_drop,
      route_info,
      date_info,
      holidays!inner (
        id,
        name,
        user_id
      )
    `)
    .eq("notified", false)
    .eq("resolved", false)
    .lt("created_at", oneHourAgo)
    .limit(10) // Process max 10 per run to avoid timeouts

  if (error || !pendingAlerts || pendingAlerts.length === 0) {
    if (error) {
      logger.warn("Error fetching pending alerts for retry", { error: error.message })
    }
    return 0
  }

  logger.info(`Found ${pendingAlerts.length} un-notified alerts to retry`)

  let successCount = 0

  for (const alert of pendingAlerts) {
    const holiday = alert.holidays as unknown as { id: string; name: string; user_id: string }
    if (!holiday) continue

    const userEmail = await getUserEmail(holiday.user_id, supabase)
    if (!userEmail) {
      logger.warn(`Skipping alert retry - no user email`, { alertId: alert.id })
      continue
    }

    const routeInfo = alert.route_info as { origin?: string; destination?: string } | null
    const dateInfo = alert.date_info as { departure_date?: string; return_date?: string } | null

    const emailResult = await sendPriceDropAlert({
      to: userEmail,
      holidayId: holiday.id,
      holidayName: holiday.name || "Your holiday",
      oldPrice: alert.old_price,
      newPrice: alert.new_price,
      percentDrop: alert.percent_drop,
      route: routeInfo
        ? { origin: routeInfo.origin, destination: routeInfo.destination }
        : undefined,
      dates: dateInfo
        ? { departure: dateInfo.departure_date, return: dateInfo.return_date }
        : undefined,
    })

    if (emailResult.success) {
      // Update baseline now that user has been notified
      await Promise.all([
        supabase
          .from("price_drop_alerts")
          .update({ notified: true })
          .eq("id", alert.id),
        supabase
          .from("holidays")
          .update({
            baseline_price: alert.new_price,
            baseline_set_at: new Date().toISOString(),
          })
          .eq("id", holiday.id),
      ])

      successCount++
      logger.info(`Retry successful for alert`, { alertId: alert.id, holidayId: holiday.id })
    } else {
      logger.warn(`Retry failed for alert`, { alertId: alert.id, error: emailResult.error })
    }

    // Small delay between retries
    await sleep(500)
  }

  return successCount
}

/**
 * Main entry point for the daily price check job.
 *
 * Queries all holidays with tracking enabled and checks prices.
 */
export async function runDailyPriceCheck(): Promise<PriceCheckResult> {
  const startTime = Date.now()

  logger.info("========================================")
  logger.info("Starting daily price check job")
  logger.info(`Time: ${new Date().toISOString()}`)
  logger.info("========================================")

  const supabase = createAdminClient()

  // First, retry any un-notified alerts from previous runs
  const retriedAlerts = await retryUnnotifiedAlerts(supabase)
  if (retriedAlerts > 0) {
    logger.info(`Retried ${retriedAlerts} previously failed email notifications`)
  }

  // Get all holidays with tracking enabled
  const { data: holidays, error: queryError } = await supabase
    .from("holidays")
    .select("*")
    .eq("price_tracking_enabled", true)

  if (queryError) {
    const durationMs = Date.now() - startTime
    logger.error("Error querying holidays", queryError)

    // Structured error log for monitoring
    logger.info("CRON_SUMMARY", {
      operation: "daily_price_check",
      holidays_checked: 0,
      alerts_created: 0,
      errors: 1,
      duration_ms: durationMs,
      success: false,
      error_type: "query_failed",
      error_message: queryError.message,
    })

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
  const disabledForInactivity = results.filter((r) => r.disabledDueToInactivity).length
  const disabledForFailures = results.filter((r) => r.disabledDueToFailures).length
  const durationMs = Date.now() - startTime

  logger.info("========================================")
  logger.info(`Completed: ${holidays.length} checked, ${alertsCreated} alerts, ${disabledForInactivity + disabledForFailures} disabled, ${errors} errors, ${retriedAlerts} retried`)
  logger.info("========================================")

  // Structured summary log for monitoring and alerting
  logger.info("CRON_SUMMARY", {
    operation: "daily_price_check",
    holidays_checked: holidays.length,
    alerts_created: alertsCreated,
    disabled_for_inactivity: disabledForInactivity,
    disabled_for_failures: disabledForFailures,
    emails_retried: retriedAlerts,
    errors: errors,
    duration_ms: durationMs,
    success: true,
  })

  // Alert developer if error rate is high (>50% failures)
  if (holidays.length > 0 && errors / holidays.length > 0.5) {
    await sendDeveloperAlert({
      subject: "High error rate in price check cron",
      message: `More than 50% of holiday price checks failed (${errors}/${holidays.length}).`,
      context: {
        holidays_checked: holidays.length,
        errors,
        alerts_created: alertsCreated,
        duration_ms: durationMs,
        failed_holidays: results
          .filter((r) => !r.success)
          .map((r) => ({ id: r.holidayId, name: r.holidayName, error: r.error }))
          .slice(0, 5), // Include first 5 failures for context
      },
    })
  }

  return {
    success: true,
    holidaysChecked: holidays.length,
    alertsCreated,
    errors,
    details: results,
  }
}

/**
 * Run price check for a single holiday (used for manual triggers).
 */
export async function runPriceCheckForSingleHoliday(
  holidayId: string
): Promise<HolidayCheckResult> {
  const supabase = createAdminClient()

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

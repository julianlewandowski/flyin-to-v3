/**
 * Price Check Health Endpoint
 * GET /api/cron/price-check/health
 *
 * Returns health status of the price tracking system.
 * Useful for monitoring and debugging.
 */

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Types for query results
interface FailingHoliday {
  id: string
  name: string
  consecutive_failures: number
}

interface StuckAlert {
  id: string
  holiday_id: string
  created_at: string
}

interface DisabledHoliday {
  id: string
  name: string
  tracking_disabled_reason: string
  updated_at: string
}

interface LastChecked {
  last_price_check: string
}

export async function GET() {
  try {
    const supabase = createAdminClient()

    // Get counts in parallel
    const [
      trackedHolidaysResult,
      failingHolidaysResult,
      stuckAlertsResult,
      recentlyDisabledResult,
      lastCheckedResult,
    ] = await Promise.all([
      // Count holidays with tracking enabled
      supabase
        .from("holidays")
        .select("id", { count: "exact", head: true })
        .eq("price_tracking_enabled", true),

      // Count holidays with consecutive failures > 0
      supabase
        .from("holidays")
        .select("id, name, consecutive_failures")
        .eq("price_tracking_enabled", true)
        .gt("consecutive_failures", 0),

      // Count alerts that are un-notified and older than 24 hours
      supabase
        .from("price_drop_alerts")
        .select("id, holiday_id, created_at")
        .eq("notified", false)
        .eq("resolved", false)
        .lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),

      // Count holidays disabled in last 7 days
      supabase
        .from("holidays")
        .select("id, name, tracking_disabled_reason, updated_at")
        .eq("price_tracking_enabled", false)
        .not("tracking_disabled_reason", "is", null)
        .gt("updated_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),

      // Get most recent price check timestamp
      supabase
        .from("holidays")
        .select("last_price_check")
        .eq("price_tracking_enabled", true)
        .not("last_price_check", "is", null)
        .order("last_price_check", { ascending: false })
        .limit(1)
        .single(),
    ])

    const trackedCount = trackedHolidaysResult.count || 0
    const failingHolidays = (failingHolidaysResult.data || []) as FailingHoliday[]
    const stuckAlerts = (stuckAlertsResult.data || []) as StuckAlert[]
    const recentlyDisabled = (recentlyDisabledResult.data || []) as DisabledHoliday[]
    const lastPriceCheck = (lastCheckedResult.data as LastChecked | null)?.last_price_check || null

    // Determine health status
    let status: "healthy" | "degraded" | "unhealthy" = "healthy"
    const issues: string[] = []

    // Check for stuck alerts (un-notified for > 24 hours)
    if (stuckAlerts.length > 0) {
      status = "degraded"
      issues.push(`${stuckAlerts.length} alert(s) stuck without notification for >24 hours`)
    }

    // Check for holidays with failures
    if (failingHolidays.length > 0) {
      if (status === "healthy") status = "degraded"
      issues.push(`${failingHolidays.length} holiday(s) have consecutive failures`)
    }

    // Check if cron hasn't run in 25 hours (should run daily)
    if (lastPriceCheck) {
      const hoursSinceLastRun = (Date.now() - new Date(lastPriceCheck).getTime()) / (1000 * 60 * 60)
      if (hoursSinceLastRun > 25) {
        status = "unhealthy"
        issues.push(`Cron hasn't run in ${hoursSinceLastRun.toFixed(1)} hours`)
      }
    } else if (trackedCount > 0) {
      status = "unhealthy"
      issues.push("No price checks have been recorded yet")
    }

    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      issues: issues.length > 0 ? issues : undefined,
      stats: {
        tracked_holidays: trackedCount,
        last_price_check: lastPriceCheck,
        hours_since_last_run: lastPriceCheck
          ? Math.round((Date.now() - new Date(lastPriceCheck).getTime()) / (1000 * 60 * 60) * 10) / 10
          : null,
      },
      problems: {
        holidays_with_failures: failingHolidays.length > 0
          ? failingHolidays.map((h) => ({
              id: h.id,
              name: h.name,
              consecutive_failures: h.consecutive_failures,
            }))
          : undefined,
        stuck_alerts: stuckAlerts.length > 0
          ? stuckAlerts.map((a) => ({
              id: a.id,
              holiday_id: a.holiday_id,
              created_at: a.created_at,
            }))
          : undefined,
        recently_disabled: recentlyDisabled.length > 0
          ? recentlyDisabled.map((h) => ({
              id: h.id,
              name: h.name,
              reason: h.tracking_disabled_reason,
              disabled_at: h.updated_at,
            }))
          : undefined,
      },
    })
  } catch (error) {
    console.error("[Health Check] Error:", error)
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

export const dynamic = "force-dynamic"

/**
 * Active Price Alerts API Route
 * GET /api/price-alerts/active
 * 
 * Returns all active (unresolved) price drop alerts for the current user.
 * Used by the global alert banner.
 */

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const DEV_BYPASS_AUTH = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "1"

export async function GET() {
  try {
    const supabase = await createClient()

    // Authentication
    let userId: string | null = null
    if (!DEV_BYPASS_AUTH) {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        )
      }
      userId = user.id
    }

    // Get all holidays with active alerts for the user
    let holidaysQuery = supabase
      .from("holidays")
      .select("id, name")
      .eq("has_active_price_alert", true)

    if (!DEV_BYPASS_AUTH && userId) {
      holidaysQuery = holidaysQuery.eq("user_id", userId)
    }

    const { data: holidays, error: holidaysError } = await holidaysQuery

    if (holidaysError) {
      console.error("[Price Alerts] Error fetching holidays:", holidaysError)
      return NextResponse.json(
        { error: "Failed to fetch holidays" },
        { status: 500 }
      )
    }

    if (!holidays || holidays.length === 0) {
      return NextResponse.json({
        success: true,
        alerts: [],
        total_count: 0,
      })
    }

    const holidayIds = holidays.map(h => h.id)
    const holidayNames: Record<string, string> = {}
    holidays.forEach(h => {
      holidayNames[h.id] = h.name
    })

    // Get unresolved alerts for these holidays
    const { data: alerts, error: alertsError } = await supabase
      .from("price_drop_alerts")
      .select("*")
      .in("holiday_id", holidayIds)
      .eq("resolved", false)
      .order("created_at", { ascending: false })

    if (alertsError) {
      console.error("[Price Alerts] Error fetching alerts:", alertsError)
      return NextResponse.json(
        { error: "Failed to fetch alerts" },
        { status: 500 }
      )
    }

    const formattedAlerts = (alerts || []).map(alert => ({
      id: alert.id,
      holiday_id: alert.holiday_id,
      holiday_name: holidayNames[alert.holiday_id] || "Unknown",
      old_price: parseFloat(alert.old_price),
      new_price: parseFloat(alert.new_price),
      percent_drop: parseFloat(alert.percent_drop),
      route_info: alert.route_info,
      date_info: alert.date_info,
      resolved: alert.resolved,
      created_at: alert.created_at,
    }))

    return NextResponse.json({
      success: true,
      alerts: formattedAlerts,
      total_count: formattedAlerts.length,
    })
  } catch (error) {
    console.error("[Price Alerts] Active alerts error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


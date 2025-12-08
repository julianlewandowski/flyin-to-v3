/**
 * Resolve Price Alert API Route
 * POST /api/price-alerts/[alertId]/resolve
 * 
 * Marks a price drop alert as resolved (dismissed).
 */

import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const DEV_BYPASS_AUTH = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "1"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const { alertId } = await params
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

    // Get the alert
    const { data: alert, error: alertError } = await supabase
      .from("price_drop_alerts")
      .select("id, holiday_id")
      .eq("id", alertId)
      .single()

    if (alertError || !alert) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 }
      )
    }

    // Verify the alert belongs to the user's holiday
    if (!DEV_BYPASS_AUTH && userId) {
      const { data: holiday } = await supabase
        .from("holidays")
        .select("id")
        .eq("id", alert.holiday_id)
        .eq("user_id", userId)
        .single()

      if (!holiday) {
        return NextResponse.json(
          { error: "Not authorized to modify this alert" },
          { status: 403 }
        )
      }
    }

    // Mark as resolved
    const { error: updateError } = await supabase
      .from("price_drop_alerts")
      .update({ resolved: true })
      .eq("id", alertId)

    if (updateError) {
      console.error("[Price Alerts] Resolve error:", updateError)
      return NextResponse.json(
        { error: "Failed to resolve alert" },
        { status: 500 }
      )
    }

    // Check if there are any remaining unresolved alerts for this holiday
    const { data: remainingAlerts } = await supabase
      .from("price_drop_alerts")
      .select("id")
      .eq("holiday_id", alert.holiday_id)
      .eq("resolved", false)

    const remainingCount = remainingAlerts?.length || 0

    // If no more active alerts, update the holiday
    if (remainingCount === 0) {
      await supabase
        .from("holidays")
        .update({
          has_active_price_alert: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", alert.holiday_id)
    }

    return NextResponse.json({
      success: true,
      message: "Alert resolved",
      remaining_alerts: remainingCount,
    })
  } catch (error) {
    console.error("[Price Alerts] Resolve error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


/**
 * Enable Price Tracking API Route
 * POST /api/holidays/[id]/price-tracking/enable
 * 
 * Enables price tracking for a holiday and stores the current cheapest price.
 */

import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const DEV_BYPASS_AUTH = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "1"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: holidayId } = await params
    const supabase = await createClient()

    // Get request body (optional threshold)
    let thresholdPercent = 10.0
    try {
      const body = await request.json()
      if (body.threshold_percent && typeof body.threshold_percent === "number") {
        thresholdPercent = body.threshold_percent
      }
    } catch {
      // No body or invalid JSON, use default threshold
    }

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

    // Verify holiday belongs to user
    let query = supabase.from("holidays").select("*").eq("id", holidayId)
    if (!DEV_BYPASS_AUTH && userId) {
      query = query.eq("user_id", userId)
    }

    const { data: holiday, error: holidayError } = await query.single()

    if (holidayError || !holiday) {
      return NextResponse.json(
        { error: "Holiday not found" },
        { status: 404 }
      )
    }

    // Get current cheapest flight price
    const { data: flights } = await supabase
      .from("flights")
      .select("price")
      .eq("holiday_id", holidayId)
      .order("price", { ascending: true })
      .limit(1)

    const currentLowestPrice = flights && flights.length > 0 
      ? parseFloat(flights[0].price) 
      : null

    // Update holiday with tracking settings
    const { data: updated, error: updateError } = await supabase
      .from("holidays")
      .update({
        price_tracking_enabled: true,
        last_tracked_price: currentLowestPrice,
        price_drop_threshold_percent: thresholdPercent,
        has_active_price_alert: false,
        last_price_check: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", holidayId)
      .select()
      .single()

    if (updateError) {
      console.error("[Price Tracking] Enable error:", updateError)
      return NextResponse.json(
        { error: "Failed to enable price tracking" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Price tracking enabled for "${holiday.name}"`,
      last_tracked_price: currentLowestPrice,
      threshold_percent: thresholdPercent,
    })
  } catch (error) {
    console.error("[Price Tracking] Enable error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


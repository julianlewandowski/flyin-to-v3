/**
 * Price Tracking Status API Route
 * GET /api/holidays/[id]/price-tracking/status
 * 
 * Returns the current price tracking status for a holiday.
 */

import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const DEV_BYPASS_AUTH = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "1"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: holidayId } = await params
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

    // Fetch holiday with price tracking fields
    let query = supabase
      .from("holidays")
      .select("id, name, price_tracking_enabled, last_tracked_price, price_drop_threshold_percent, has_active_price_alert, last_price_check")
      .eq("id", holidayId)

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

    // Get current lowest flight price
    const { data: flights } = await supabase
      .from("flights")
      .select("price")
      .eq("holiday_id", holidayId)
      .order("price", { ascending: true })
      .limit(1)

    const currentLowestPrice = flights && flights.length > 0 
      ? parseFloat(flights[0].price) 
      : null

    return NextResponse.json({
      success: true,
      holiday_id: holidayId,
      holiday_name: holiday.name,
      enabled: holiday.price_tracking_enabled || false,
      last_tracked_price: holiday.last_tracked_price ? parseFloat(holiday.last_tracked_price) : null,
      current_lowest_price: currentLowestPrice,
      threshold_percent: holiday.price_drop_threshold_percent ? parseFloat(holiday.price_drop_threshold_percent) : 10.0,
      has_active_alert: holiday.has_active_price_alert || false,
      last_check: holiday.last_price_check,
    })
  } catch (error) {
    console.error("[Price Tracking] Status error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


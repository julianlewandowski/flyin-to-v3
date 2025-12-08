/**
 * Disable Price Tracking API Route
 * POST /api/holidays/[id]/price-tracking/disable
 * 
 * Disables price tracking without deleting historical data.
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
    let query = supabase.from("holidays").select("id, name").eq("id", holidayId)
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

    // Update holiday - only disable tracking, preserve history
    const { error: updateError } = await supabase
      .from("holidays")
      .update({
        price_tracking_enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", holidayId)

    if (updateError) {
      console.error("[Price Tracking] Disable error:", updateError)
      return NextResponse.json(
        { error: "Failed to disable price tracking" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Price tracking disabled for "${holiday.name}"`,
    })
  } catch (error) {
    console.error("[Price Tracking] Disable error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


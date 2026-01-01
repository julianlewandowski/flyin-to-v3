import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAllInsights } from "@/lib/services/insights"
import type { Holiday, Flight } from "@/lib/types"

const DEV_BYPASS_AUTH = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "1"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    console.log("[Smart Insights] Using local TypeScript implementation")

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

    // Fetch holiday
    let query = supabase.from("holidays").select("*").eq("id", id)
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

    // Fetch flights
    const { data: flights } = await supabase
      .from("flights")
      .select("*")
      .eq("holiday_id", id)
      .order("price")

    if (!flights || flights.length === 0) {
      return NextResponse.json({
        success: false,
        holiday_id: id,
        error: "No flights found for this holiday. Please search for flights first.",
        price_analysis: null,
        alternative_suggestions: null,
        weather_forecast: null,
      })
    }

    // Generate all insights
    const insights = await getAllInsights(holiday as Holiday, flights as Flight[])

    console.log("[Smart Insights] Success")
    return NextResponse.json({
      success: true,
      holiday_id: id,
      ...insights,
    })
  } catch (error) {
    console.error("[Smart Insights] Unexpected error:", error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to fetch smart insights. Please try again.",
        type: error instanceof Error ? error.constructor.name : "Unknown"
      },
      { status: 500 }
    )
  }
}

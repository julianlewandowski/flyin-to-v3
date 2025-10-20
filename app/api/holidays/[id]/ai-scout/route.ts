import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { discoverRoutes } from "@/lib/ai-scout"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const holidayId = params.id

    // Get the holiday
    const { data: holiday, error: holidayError } = await supabase
      .from("holidays")
      .select("*")
      .eq("id", holidayId)
      .single()

    if (holidayError || !holiday) {
      return NextResponse.json({ error: "Holiday not found" }, { status: 404 })
    }

    // Check if AI scan was done recently (within 24 hours)
    if (holiday.last_ai_scan) {
      const lastScan = new Date(holiday.last_ai_scan)
      const now = new Date()
      const hoursSinceLastScan = (now.getTime() - lastScan.getTime()) / (1000 * 60 * 60)

      if (hoursSinceLastScan < 24) {
        return NextResponse.json({
          message: "AI scan already performed recently",
          results: holiday.ai_discovery_results || [],
          cached: true,
        })
      }
    }

    // Run AI discovery
    const results = await discoverRoutes({
      origins: holiday.origins || [holiday.origin],
      destinations: holiday.destinations?.length ? holiday.destinations : undefined,
      startDate: holiday.start_date,
      endDate: holiday.end_date,
      tripDurationMin: holiday.trip_duration_min || 7,
      tripDurationMax: holiday.trip_duration_max || 14,
      budget: holiday.budget || undefined,
      preferredWeekdays: holiday.preferred_weekdays || undefined,
      maxLayovers: holiday.max_layovers || 2,
    })

    // Update holiday with AI results
    const { error: updateError } = await supabase
      .from("holidays")
      .update({
        ai_discovery_results: results,
        last_ai_scan: new Date().toISOString(),
      })
      .eq("id", holidayId)

    if (updateError) {
      console.error("[v0] Error updating holiday with AI results:", updateError)
    }

    return NextResponse.json({
      message: "AI route discovery completed",
      results,
      cached: false,
    })
  } catch (error) {
    console.error("[v0] Error in AI scout route:", error)
    return NextResponse.json({ error: "Failed to discover routes" }, { status: 500 })
  }
}

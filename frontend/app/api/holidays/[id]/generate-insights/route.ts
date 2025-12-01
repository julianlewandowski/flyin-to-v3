import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import type { Flight } from "@/lib/types"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch holiday details
    const { data: holiday, error: holidayError } = await supabase
      .from("holidays")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (holidayError || !holiday) {
      return NextResponse.json({ error: "Holiday not found" }, { status: 404 })
    }

    // Fetch flights for this holiday
    const { data: flights, error: flightsError } = await supabase
      .from("flights")
      .select("*")
      .eq("holiday_id", id)
      .order("price", { ascending: true })

    if (flightsError || !flights || flights.length === 0) {
      return NextResponse.json({ error: "No flights found. Please search for flights first." }, { status: 400 })
    }

    const flightData = flights as Flight[]

    const cheapestFlight = flightData[0]
    const avgPrice = Math.round(flightData.reduce((sum, f) => sum + f.price, 0) / flightData.length)
    const destinations = [...new Set(flightData.map((f) => f.destination))]

    const placeholderInsights = [
      {
        type: "price_trend",
        text: `Great news! We found flights starting at $${cheapestFlight.price} to ${cheapestFlight.destination}. The average price across all destinations is $${avgPrice}, which is competitive for this route and time period.`,
      },
      {
        type: "best_time",
        text: `Based on the current prices, now is a good time to book. Prices for flights departing ${holiday.start_date} are stable. We recommend booking within the next 2-3 weeks to secure these rates.`,
      },
      {
        type: "alternative_destination",
        text:
          destinations.length > 1
            ? `Among your ${destinations.length} destinations, ${cheapestFlight.destination} offers the best value at $${cheapestFlight.price}. Consider prioritizing this destination if budget is a concern.`
            : `${cheapestFlight.destination} is showing good prices. Consider nearby cities or airports for potentially better deals.`,
      },
      {
        type: "general",
        text: `Your holiday from ${holiday.origin} has ${flightData.length} available flight options. ${cheapestFlight.airline} offers the most competitive pricing. Book early and consider flexible dates for the best deals.`,
      },
    ]

    // Store insights in database
    const storedInsights = []
    for (const insight of placeholderInsights) {
      const { data: insertedInsight, error: insertError } = await supabase
        .from("ai_insights")
        .insert({
          holiday_id: id,
          insight_text: insight.text,
          insight_type: insight.type,
        })
        .select()
        .single()

      if (!insertError && insertedInsight) {
        storedInsights.push(insertedInsight)
      }
    }

    return NextResponse.json({
      success: true,
      insights: storedInsights,
      message: `Generated ${storedInsights.length} insights`,
    })
  } catch (error) {
    console.error("Generate insights error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate insights" },
      { status: 500 },
    )
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { lookupFare } from "@/lib/airhob-api"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const flightId = params.id

    // Get the flight with track_id and fare_id
    const { data: flight, error: flightError } = await supabase.from("flights").select("*").eq("id", flightId).single()

    if (flightError || !flight) {
      return NextResponse.json({ error: "Flight not found" }, { status: 404 })
    }

    if (!flight.track_id || !flight.fare_id) {
      return NextResponse.json({ error: "Flight missing tracking information" }, { status: 400 })
    }

    // Look up the fare with Airhob
    const lookupResponse = await lookupFare({
      TrackId: flight.track_id,
      FareId: flight.fare_id,
    })

    // Update flight with latest information
    const updatedData = {
      price: lookupResponse.Fare?.TotalFare || flight.price,
      referral_link: lookupResponse.ReferralLink || flight.referral_link,
      verified_at: new Date().toISOString(),
      old_price: flight.price,
    }

    const { error: updateError } = await supabase.from("flights").update(updatedData).eq("id", flightId)

    if (updateError) {
      console.error("[v0] Error updating flight:", updateError)
    }

    // Check for price drop and create alert if needed
    if (updatedData.price < flight.price * 0.9) {
      const priceDrop = ((flight.price - updatedData.price) / flight.price) * 100

      await supabase.from("alerts").insert({
        holiday_id: flight.holiday_id,
        flight_id: flightId,
        old_price: flight.price,
        new_price: updatedData.price,
        price_drop_percent: priceDrop,
        notified: false,
      })
    }

    return NextResponse.json({
      message: "Flight fare verified",
      flight: { ...flight, ...updatedData },
      price_changed: updatedData.price !== flight.price,
    })
  } catch (error) {
    console.error("[v0] Error in flight look route:", error)
    return NextResponse.json({ error: "Failed to verify fare" }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { searchFlights, formatDateForAirhob } from "@/lib/airhob-api"
import type { AIDiscoveryResult } from "@/lib/types"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const holidayId = params.id

    // Get the holiday with AI discovery results
    const { data: holiday, error: holidayError } = await supabase
      .from("holidays")
      .select("*")
      .eq("id", holidayId)
      .single()

    if (holidayError || !holiday) {
      return NextResponse.json({ error: "Holiday not found" }, { status: 404 })
    }

    const aiResults: AIDiscoveryResult[] = holiday.ai_discovery_results || []

    if (aiResults.length === 0) {
      return NextResponse.json({ error: "No AI discovery results to verify" }, { status: 400 })
    }

    // Verify each AI-discovered route with Airhob
    const verifiedFlights = []

    for (const route of aiResults.slice(0, 5)) {
      // Limit to 5 to avoid rate limits
      try {
        const searchRequest = {
          TripType: "R" as const,
          NoOfAdults: 1,
          ClassType: "Economy" as const,
          OriginDestination: [
            {
              Origin: route.origin,
              Destination: route.destination,
              TravelDate: formatDateForAirhob(route.depart),
            },
            {
              Origin: route.destination,
              Destination: route.origin,
              TravelDate: formatDateForAirhob(route.return),
            },
          ],
          Currency: "EUR",
        }

        const airhobResponse = await searchFlights(searchRequest)

        // Parse Airhob response and extract best flights
        if (airhobResponse?.Results?.length > 0) {
          const bestFlight = airhobResponse.Results[0] // Get cheapest option

          const flightData = {
            holiday_id: holidayId,
            origin: route.origin,
            destination: route.destination,
            departure_date: route.depart,
            return_date: route.return,
            price: bestFlight.Fare?.TotalFare || route.estimated_price || 0,
            airline: bestFlight.Segments?.[0]?.Airline?.Name || "Unknown",
            source: "airhob",
            verified_at: new Date().toISOString(),
            track_id: airhobResponse.TrackId,
            fare_id: bestFlight.FareId,
            referral_link: bestFlight.ReferralLink || null,
            layovers: bestFlight.Segments?.length - 1 || 0,
            flight_duration: bestFlight.JourneyDuration || null,
            baggage_info: {
              cabin: bestFlight.Baggage?.Cabin || "Not specified",
              checked: bestFlight.Baggage?.CheckIn || "Not specified",
            },
          }

          verifiedFlights.push(flightData)
        }
      } catch (error) {
        console.error(`[v0] Error verifying route ${route.origin}-${route.destination}:`, error)
        // Continue with next route
      }
    }

    // Insert verified flights into database
    if (verifiedFlights.length > 0) {
      const { error: insertError } = await supabase.from("flights").insert(verifiedFlights)

      if (insertError) {
        console.error("[v0] Error inserting verified flights:", insertError)
        return NextResponse.json({ error: "Failed to save verified flights" }, { status: 500 })
      }
    }

    return NextResponse.json({
      message: "Flight verification completed",
      verified_count: verifiedFlights.length,
      flights: verifiedFlights,
    })
  } catch (error) {
    console.error("[v0] Error in verify flights route:", error)
    return NextResponse.json({ error: "Failed to verify flights" }, { status: 500 })
  }
}

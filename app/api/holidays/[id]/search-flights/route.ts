import { createClient } from "@/lib/supabase/server"
import { searchFlights, formatDateForKiwi } from "@/lib/kiwi-api"
import { NextResponse } from "next/server"

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

    console.log("[v0] Searching flights for holiday:", holiday.name)

    // Search flights for each destination
    const allFlights = []

    for (const destination of holiday.destinations) {
      try {
        console.log("[v0] Searching flights from", holiday.origin, "to", destination)

        const flights = await searchFlights({
          fly_from: holiday.origin,
          fly_to: destination,
          date_from: formatDateForKiwi(holiday.start_date),
          date_to: formatDateForKiwi(holiday.start_date),
          return_from: formatDateForKiwi(holiday.end_date),
          return_to: formatDateForKiwi(holiday.end_date),
          price_to: holiday.budget || undefined,
          limit: 5,
        })

        console.log("[v0] Found", flights.length, "flights to", destination)

        // Store flights in database
        for (const flight of flights) {
          const departureDate = flight.route[0]?.local_departure || flight.local_departure
          const returnDate =
            flight.route.length > 1 ? flight.route[flight.route.length - 1]?.local_arrival : flight.local_arrival

          const { data: insertedFlight, error: insertError } = await supabase
            .from("flights")
            .insert({
              holiday_id: id,
              origin: flight.flyFrom,
              destination: flight.flyTo,
              departure_date: departureDate.split("T")[0],
              return_date: returnDate ? returnDate.split("T")[0] : null,
              price: flight.price,
              airline: flight.airlines.join(", "),
              booking_link: flight.deep_link,
              last_checked: new Date().toISOString(),
            })
            .select()
            .single()

          if (!insertError && insertedFlight) {
            allFlights.push(insertedFlight)
          }
        }
      } catch (error) {
        console.error("[v0] Error searching flights to", destination, ":", error)
        // Continue with other destinations even if one fails
      }
    }

    console.log("[v0] Total flights stored:", allFlights.length)

    return NextResponse.json({
      success: true,
      flights: allFlights,
      message: `Found ${allFlights.length} flights`,
    })
  } catch (error) {
    console.error("[v0] Search flights error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to search flights" },
      { status: 500 },
    )
  }
}

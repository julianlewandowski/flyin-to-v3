import { createClient } from "@/lib/supabase/server"
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

    const allFlights = []
    const airlines = ["Ryanair", "EasyJet", "Wizz Air", "British Airways", "Lufthansa"]

    for (const destination of holiday.destinations) {
      // Generate 3-5 random placeholder flights per destination
      const numFlights = Math.floor(Math.random() * 3) + 3

      for (let i = 0; i < numFlights; i++) {
        const basePrice = Math.floor(Math.random() * 300) + 50
        const airline = airlines[Math.floor(Math.random() * airlines.length)]

        const { data: insertedFlight, error: insertError } = await supabase
          .from("flights")
          .insert({
            holiday_id: id,
            origin: holiday.origin,
            destination: destination,
            departure_date: holiday.start_date,
            return_date: holiday.end_date,
            price: basePrice,
            airline: airline,
            booking_link: `https://www.kiwi.com/deep?from=${holiday.origin}&to=${destination}`,
            last_checked: new Date().toISOString(),
          })
          .select()
          .single()

        if (!insertError && insertedFlight) {
          allFlights.push(insertedFlight)
        }
      }
    }

    return NextResponse.json({
      success: true,
      flights: allFlights,
      message: `Found ${allFlights.length} placeholder flights`,
    })
  } catch (error) {
    console.error("Search flights error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to search flights" },
      { status: 500 },
    )
  }
}

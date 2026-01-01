import { NextRequest, NextResponse } from "next/server"
import { discoverDestinations } from "@/lib/services/destination-discovery"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("[AI Discovery] Received request:", JSON.stringify(body, null, 2))

    // Validate required fields - accept both camelCase and snake_case
    const origins = body.origins
    const dateRange = body.dateRange || body.date_range
    const tripLengths = body.tripLengths || body.trip_lengths
    
    if (!origins || !Array.isArray(origins) || origins.length === 0) {
      return NextResponse.json(
        { error: "Origins are required" },
        { status: 400 }
      )
    }

    if (!dateRange || !dateRange.start || !dateRange.end) {
      return NextResponse.json(
        { error: "Date range is required" },
        { status: 400 }
      )
    }

    if (!tripLengths || typeof tripLengths.min !== "number" || typeof tripLengths.max !== "number") {
      return NextResponse.json(
        { error: "Trip lengths are required" },
        { status: 400 }
      )
    }

    // Use local TypeScript implementation
    console.log("[AI Discovery] Using local TypeScript implementation")
    
    const destinations = await discoverDestinations({
      origins,
      dateRange,
      tripLengths,
      preferences: body.preferences || null,
      prompt: body.prompt || null,
    })

    console.log("[AI Discovery] Success:", { destinations })
    return NextResponse.json({ destinations })
  } catch (error) {
    console.error("[AI Discovery] Unexpected error:", error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Could not discover destinations. Please try again.",
        type: error instanceof Error ? error.constructor.name : "Unknown"
      },
      { status: 500 }
    )
  }
}

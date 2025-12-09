import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

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

    // Call backend API
    const requestBody = {
      origins: origins,
      date_range: dateRange,
      trip_lengths: tripLengths,
      preferences: body.preferences || null,
      prompt: body.prompt || null,
    }
    
    console.log("[AI Discovery] Calling backend:", BACKEND_URL)
    console.log("[AI Discovery] Request body:", JSON.stringify(requestBody, null, 2))
    
    let response: Response
    try {
      response = await fetch(`${BACKEND_URL}/ai/discover-destinations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })
    } catch (fetchError) {
      console.error("[AI Discovery] Fetch error:", fetchError)
      return NextResponse.json(
        { 
          error: `Failed to connect to backend server at ${BACKEND_URL}. Please ensure the backend is running.`,
          details: fetchError instanceof Error ? fetchError.message : "Unknown fetch error"
        },
        { status: 503 }
      )
    }

    if (!response.ok) {
      const errorText = await response.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { detail: errorText || `Backend returned ${response.status}` }
      }
      
      console.error("[AI Discovery] Backend error:", response.status, errorData)
      return NextResponse.json(
        { 
          error: errorData.detail || errorData.error || "Could not discover destinations",
          status: response.status
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log("[AI Discovery] Success:", data)
    return NextResponse.json(data)
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





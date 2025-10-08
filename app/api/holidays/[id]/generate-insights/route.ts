import { createClient } from "@/lib/supabase/server"
import { generateText } from "ai"
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

    console.log("[v0] Generating AI insights for holiday:", holiday.name)
    console.log("[v0] Analyzing", flightData.length, "flights")

    // Prepare flight data for AI analysis
    const flightSummary = flightData
      .slice(0, 10)
      .map(
        (f) =>
          `${f.origin} → ${f.destination}: $${f.price} (${f.airline || "Unknown airline"}, Depart: ${f.departure_date})`,
      )
      .join("\n")

    // Generate insights using AI
    const { text } = await generateText({
      model: "openai/gpt-4o-mini",
      prompt: `You are a travel expert analyzing flight data for a holiday trip. 

Holiday Details:
- Name: ${holiday.name}
- Origin: ${holiday.origin}
- Destinations: ${holiday.destinations.join(", ")}
- Travel Dates: ${holiday.start_date} to ${holiday.end_date}
- Budget: ${holiday.budget ? `$${holiday.budget}` : "No budget set"}

Available Flights (sorted by price):
${flightSummary}

Please provide 3-4 specific, actionable insights about these flights. For each insight, specify the type and provide detailed analysis:

1. Price Trend Analysis (type: price_trend) - Analyze if prices are good, compare destinations, identify best deals
2. Best Time to Book (type: best_time) - Recommend when to book based on the data
3. Alternative Destinations (type: alternative_destination) - Suggest cheaper alternatives if applicable
4. General Recommendation (type: general) - Overall travel advice

Format your response as JSON array with objects containing "type" and "text" fields. Keep each insight concise (2-3 sentences) and specific to the data provided.`,
    })

    console.log("[v0] AI response received:", text)

    // Parse AI response
    let insights: Array<{ type: string; text: string }> = []
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0])
      } else {
        // Fallback: create a general insight from the text
        insights = [
          {
            type: "general",
            text: text.slice(0, 500),
          },
        ]
      }
    } catch (parseError) {
      console.error("[v0] Failed to parse AI response:", parseError)
      // Create a general insight from the raw text
      insights = [
        {
          type: "general",
          text: text.slice(0, 500),
        },
      ]
    }

    console.log("[v0] Parsed", insights.length, "insights")

    // Store insights in database
    const storedInsights = []
    for (const insight of insights) {
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

    console.log("[v0] Stored", storedInsights.length, "insights in database")

    return NextResponse.json({
      success: true,
      insights: storedInsights,
      message: `Generated ${storedInsights.length} insights`,
    })
  } catch (error) {
    console.error("[v0] Generate insights error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate insights" },
      { status: 500 },
    )
  }
}

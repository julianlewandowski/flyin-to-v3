/**
 * Unified Flight Search API Route
 * 
 * Implements the full pipeline: Retrieval → Normalization → Reasoning
 * 
 * TEMPORARY: Auth disabled for local development & testing.
 */

import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { searchFlightsParallel, generateSearchParams } from "@/lib/serpapi"
import { normalizeSerpApiResponse, normalizeFlightOffers } from "@/lib/normalize-flights"
import { extractPreferences } from "@/lib/llm-preferences"
import { scoreFlightOffers } from "@/lib/llm-scorer"
import type { Holiday } from "@/lib/types"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // ========================================================================
    // 🔓 AUTH DISABLED FOR DEVELOPMENT
    // ========================================================================
    // const {
    //   data: { user },
    //   error: userError,
    // } = await supabase.auth.getUser()
    //
    // if (userError || !user) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }

    // ========================================================================
    // Fetch holiday without user restriction (public mode)
    // ========================================================================
    const { data: holiday, error: holidayError } = await supabase
      .from("holidays")
      .select("*")
      .eq("id", id)
      // .eq("user_id", user.id)   // DISABLED FOR DEVELOPMENT
      .single()

    if (holidayError || !holiday) {
      return NextResponse.json({ error: "Holiday not found" }, { status: 404 })
    }

    const holidayData = holiday as Holiday

    // ========================================================================
    // STEP 1: Extract Preferences (Reasoning Layer)
    // ========================================================================
    console.log("[Unified Search] Extracting preferences...")
    const preferences = await extractPreferences({
      holiday: holidayData,
      additional_context: `User is searching for flights for holiday: ${holidayData.name}`,
    })

    // ========================================================================
    // STEP 2: Retrieval Layer - SerpApi
    // ========================================================================
    console.log("[Unified Search] Searching SerpApi...")
    const searchParamsArray = generateSearchParams(holidayData)

    if (searchParamsArray.length === 0) {
      return NextResponse.json(
        { error: "No search parameters generated" },
        { status: 400 }
      )
    }

    const searchResults = await searchFlightsParallel(searchParamsArray)

    const allRawResults: any[] = []
    for (const result of searchResults) {
      if (result.result && !result.error) {
        const flights =
          result.result.best_flights ||
          result.result.other_flights ||
          result.result.flights ||
          []
        allRawResults.push(...flights)
      }
    }

    console.log(`[Unified Search] Retrieved ${allRawResults.length} raw results`)

    // ========================================================================
    // STEP 3: Normalization
    // ========================================================================
    console.log("[Unified Search] Normalizing results...")
    const normalizedOffers = normalizeFlightOffers(allRawResults, "serpapi")

    console.log(
      `[Unified Search] Normalized ${normalizedOffers.length} offers`
    )

    if (normalizedOffers.length === 0) {
      return NextResponse.json({
        success: true,
        offers: [],
        preferences,
        message: "No flights found matching your criteria",
        metadata: {
          total_retrieved: allRawResults.length,
          total_normalized: 0,
          total_scored: 0,
        },
      })
    }

    // ========================================================================
    // STEP 4: LLM Scoring
    // ========================================================================
    console.log("[Unified Search] Scoring offers with LLM...")

    const maxOffersToScore = 20
    const offersToScore = normalizedOffers.slice(0, maxOffersToScore)

    const scoredOffers = await scoreFlightOffers(
      offersToScore,
      preferences
    )

    const topOffers = scoredOffers.slice(0, 10)

    console.log(
      `[Unified Search] Scored ${scoredOffers.length} offers, returning top ${topOffers.length}`
    )

    // ========================================================================
    // Return final result
    // ========================================================================
    return NextResponse.json({
      success: true,
      offers: topOffers,
      preferences,
      message: `Found ${topOffers.length} best-matching flight offers`,
      metadata: {
        total_retrieved: allRawResults.length,
        total_normalized: normalizedOffers.length,
        total_scored: scoredOffers.length,
      },
    })
  } catch (error) {
    console.error("[Unified Search] Error:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to search flights",
        details:
          process.env.NODE_ENV === "development"
            ? String(error)
            : undefined,
      },
      { status: 500 }
    )
  }
}

/**
 * Unified Flight Search API Route
 * 
 * Implements the full pipeline: Retrieval → Normalization → Reasoning
 * 
 * Supports dev-mode auth bypass via NEXT_PUBLIC_DEV_BYPASS_AUTH="1"
 */

import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { searchFlightsParallel, generateSearchParams } from "@/lib/serpapi"
import { normalizeSerpApiResponse, normalizeFlightOffers } from "@/lib/normalize-flights"
import { extractPreferences } from "@/lib/llm-preferences"
import { scoreFlightOffers } from "@/lib/llm-scorer"
import type { Holiday } from "@/lib/types"

const DEV_BYPASS_AUTH = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "1"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  console.log("[Unified Search] ========================================")
  console.log("[Unified Search] Starting unified flight search")
  console.log("[Unified Search] ========================================")

  try {
    // Check API key configuration early
    const serpApiKey = process.env.SERPAPI_KEY
    if (!serpApiKey) {
      console.error("[Unified Search] SERPAPI_KEY is not configured")
      return NextResponse.json(
        {
          error: "SerpApi API key not configured",
          details: "SERPAPI_KEY environment variable is missing",
          suggestion: "Please set SERPAPI_KEY in your .env.local file",
        },
        { status: 500 }
      )
    }
    console.log("[Unified Search] SerpApi key configured:", serpApiKey.substring(0, 8) + "***")

    const { id } = await params
    console.log("[Unified Search] Holiday ID:", id)
    console.log("[Unified Search] Dev bypass auth:", DEV_BYPASS_AUTH)

    const supabase = await createClient()

    // ========================================================================
    // Authentication (with dev-mode bypass)
    // ========================================================================
    let userId: string | null = null

    if (!DEV_BYPASS_AUTH) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        console.error("[Unified Search] Auth error:", userError?.message || "No user")
        return NextResponse.json(
          { 
            error: "Unauthorized",
            details: DEV_BYPASS_AUTH ? undefined : "Please log in to access this resource"
          },
          { status: 401 }
        )
      }

      userId = user.id
      console.log("[Unified Search] Authenticated user:", user.id)
    } else {
      console.log("[Unified Search] Dev mode: Auth check bypassed")
    }

    // ========================================================================
    // Fetch holiday from database
    // ========================================================================
    console.log("[Unified Search] Fetching holiday from database...")
    
    let query = supabase
      .from("holidays")
      .select("*")
      .eq("id", id)

    if (!DEV_BYPASS_AUTH && userId) {
      query = query.eq("user_id", userId)
    }

    const { data: holiday, error: holidayError } = await query.single()

    if (holidayError) {
      console.error("[Unified Search] Holiday fetch error:", holidayError)
      return NextResponse.json(
        { 
          error: "Holiday not found",
          details: holidayError.message 
        },
        { status: 404 }
      )
    }

    if (!holiday) {
      console.error("[Unified Search] Holiday not found for ID:", id)
      return NextResponse.json(
        { error: "Holiday not found" },
        { status: 404 }
      )
    }

    console.log("[Unified Search] Holiday found:", {
      id: holiday.id,
      name: holiday.name,
      origin: holiday.origin,
      origins: holiday.origins,
      destinations: holiday.destinations,
      start_date: holiday.start_date,
      end_date: holiday.end_date,
      has_ai_results: !!holiday.ai_discovery_results,
      ai_results_count: Array.isArray(holiday.ai_discovery_results) ? holiday.ai_discovery_results.length : 0,
    })

    const holidayData = holiday as Holiday

    // Validate holiday data
    if (!holidayData.start_date || !holidayData.end_date) {
      console.error("[Unified Search] Missing dates in holiday")
      return NextResponse.json(
        { 
          error: "Invalid holiday data",
          details: "Holiday is missing start_date or end_date"
        },
        { status: 400 }
      )
    }

    // ========================================================================
    // STEP 1: Extract Preferences (Reasoning Layer)
    // ========================================================================
    console.log("[Unified Search] STEP 1: Extracting preferences...")
    let preferences
    
    try {
      preferences = await extractPreferences({
        holiday: holidayData,
        additional_context: `User is searching for flights for holiday: ${holidayData.name}`,
      })
      console.log("[Unified Search] Preferences extracted:", {
        has_budget: !!preferences.budget,
        has_layover_tolerance: !!preferences.layover_tolerance,
        has_preferred_times: !!preferences.preferred_times,
      })
    } catch (error) {
      console.error("[Unified Search] Error extracting preferences:", error)
      // Continue with empty preferences rather than failing
      preferences = {}
    }

    // ========================================================================
    // STEP 2: Generate Search Parameters
    // ========================================================================
    console.log("[Unified Search] STEP 2: Generating search parameters...")
    let searchParamsArray: ReturnType<typeof generateSearchParams>

    try {
      searchParamsArray = generateSearchParams(holidayData)
      console.log("[Unified Search] Generated", searchParamsArray.length, "search parameter sets")
    } catch (error) {
      console.error("[Unified Search] Error generating search params:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to generate search parameters"
      
      // Provide helpful error messages
      if (errorMessage.includes("No origins")) {
        return NextResponse.json(
          {
            error: "No origins found",
            details: "Please provide at least one origin airport in your holiday configuration",
            suggestion: "Update your holiday to include origin airports",
          },
          { status: 400 }
        )
      }

      if (errorMessage.includes("No valid search configurations")) {
        return NextResponse.json(
          {
            error: "No search configurations generated",
            details: "Please provide destinations or run AI discovery first",
            suggestion: holidayData.use_ai_discovery 
              ? "Click 'AI Scout' to discover routes first"
              : "Add destinations to your holiday configuration",
          },
          { status: 400 }
        )
      }

      if (errorMessage.includes("date")) {
        return NextResponse.json(
          {
            error: "Invalid dates",
            details: errorMessage,
            suggestion: "Please ensure start_date is before end_date and dates are in YYYY-MM-DD format",
          },
          { status: 400 }
        )
      }

      return NextResponse.json(
        {
          error: "Failed to generate search parameters",
          details: errorMessage,
        },
        { status: 400 }
      )
    }

    if (searchParamsArray.length === 0) {
      console.error("[Unified Search] No search parameters generated")
      return NextResponse.json(
        {
          error: "No search parameters generated",
          details: "Unable to generate search parameters from holiday data",
        },
        { status: 400 }
      )
    }

    // ========================================================================
    // STEP 3: Retrieval Layer - SerpApi
    // ========================================================================
    console.log("[Unified Search] STEP 3: Searching SerpApi with", searchParamsArray.length, "parameter sets...")
    
    let searchResults
    try {
      searchResults = await searchFlightsParallel(searchParamsArray)
      console.log("[Unified Search] SerpApi search completed:", {
        total_searches: searchResults.length,
        successful: searchResults.filter((r) => !r.error && r.result).length,
        failed: searchResults.filter((r) => r.error).length,
      })
    } catch (error) {
      console.error("[Unified Search] SerpApi search error:", error)
      return NextResponse.json(
        {
          error: "Flight search failed",
          details: error instanceof Error ? error.message : "SerpApi request failed",
          suggestion: "Please check your SERPAPI_KEY environment variable",
        },
        { status: 500 }
      )
    }

    // Collect all raw results
    const allRawResults: any[] = []
    const errors: Array<{ params: any; error: string }> = []

    for (const result of searchResults) {
      if (result.error) {
        const errorMsg = result.error.message || String(result.error)
        console.error("[Unified Search] Search error for route:", result.params.departure_id, "->", result.params.arrival_id)
        console.error("[Unified Search] Error details:", errorMsg)
        console.error("[Unified Search] Full error:", result.error)
        errors.push({
          params: result.params,
          error: errorMsg,
        })
        continue
      }

      if (result.result) {
        // Log the structure of the result to help debug
        console.log("[Unified Search] Result structure for route:", result.params.departure_id, "->", result.params.arrival_id)
        console.log("[Unified Search] Result keys:", Object.keys(result.result))
        
        // Check for error in the result itself
        if (result.result.error) {
          const errorMsg = result.result.error || "Unknown API error"
          console.error("[Unified Search] API returned error in result:", errorMsg)
          errors.push({
            params: result.params,
            error: errorMsg,
          })
          continue
        }

        const flights =
          result.result.best_flights ||
          result.result.other_flights ||
          result.result.flights ||
          []
        
        console.log("[Unified Search] Found", flights.length, "flights for route:", result.params.departure_id, "->", result.params.arrival_id)
        
        if (flights.length > 0) {
          // Log the structure of the first flight to understand the format
          console.log("[Unified Search] First flight structure:", JSON.stringify(flights[0], null, 2).substring(0, 1000))
          console.log("[Unified Search] First flight keys:", Object.keys(flights[0] || {}))
          allRawResults.push(...flights)
        } else {
          console.warn("[Unified Search] No flights in result for route:", result.params.departure_id, "->", result.params.arrival_id)
          console.warn("[Unified Search] Result data:", JSON.stringify(result.result, null, 2).substring(0, 500))
        }
      } else {
        console.warn("[Unified Search] No result object for route:", result.params.departure_id, "->", result.params.arrival_id)
      }
    }

    console.log(`[Unified Search] Retrieved ${allRawResults.length} raw flight results`)
    if (errors.length > 0) {
      console.warn("[Unified Search] Some searches failed:", errors.length)
    }

    // ========================================================================
    // STEP 4: Normalization
    // ========================================================================
    console.log("[Unified Search] STEP 4: Normalizing results...")
    console.log("[Unified Search] Sample raw result structure:", allRawResults.length > 0 ? JSON.stringify(allRawResults[0], null, 2).substring(0, 1500) : "No results")
    
    // Get currency from search params (should be consistent across all searches)
    const requestCurrency = searchParamsArray[0]?.currency || "EUR"
    const normalizedOffers = normalizeFlightOffers(allRawResults, "serpapi", requestCurrency)

    console.log(
      `[Unified Search] Normalized ${normalizedOffers.length} offers from ${allRawResults.length} raw results`
    )

    if (normalizedOffers.length === 0) {
      console.warn("[Unified Search] No offers normalized. Possible reasons:")
      console.warn("  - SerpApi returned empty results")
      console.warn("  - Results don't match expected format")
      console.warn("  - Normalization filters removed all results")
      console.warn("[Unified Search] Raw results sample:", allRawResults.length > 0 ? JSON.stringify(allRawResults[0], null, 2).substring(0, 500) : "No raw results")
      
      // Provide more helpful error message
      let errorMessage = "No flights found matching your criteria"
      let suggestion = ""
      
      if (errors.length > 0) {
        const firstError = errors[0]
        if (firstError.error.includes("SERPAPI_KEY")) {
          errorMessage = "SerpApi API key is not configured"
          suggestion = "Please set SERPAPI_KEY in your environment variables"
        } else if (firstError.error.includes("401") || firstError.error.includes("Unauthorized")) {
          errorMessage = "SerpApi authentication failed"
          suggestion = "Please check your SERPAPI_KEY is valid"
        } else if (firstError.error.includes("429") || firstError.error.includes("rate limit")) {
          errorMessage = "SerpApi rate limit exceeded"
          suggestion = "Please wait a moment and try again"
        } else {
          errorMessage = `Search failed: ${firstError.error}`
          suggestion = "Please check your search parameters and try again"
        }
      } else if (allRawResults.length === 0) {
        errorMessage = "No flights returned from SerpApi"
        suggestion = "Try adjusting your search dates or destinations"
      } else {
        errorMessage = "Flights were found but couldn't be normalized"
        suggestion = "The API response format may have changed. Check server logs for details."
      }
      
      return NextResponse.json({
        success: false,
        offers: [],
        preferences,
        message: errorMessage,
        suggestion,
        metadata: {
          total_retrieved: allRawResults.length,
          total_normalized: 0,
          total_scored: 0,
          search_errors: errors.length > 0 ? errors : undefined,
        },
        debug: {
          raw_results_count: allRawResults.length,
          search_params_count: searchParamsArray.length,
          normalized_count: 0,
          errors_count: errors.length,
        },
      })
    }

    // ========================================================================
    // STEP 5: LLM Scoring
    // ========================================================================
    console.log("[Unified Search] STEP 5: Scoring offers with LLM...")

    const maxOffersToScore = 20
    const offersToScore = normalizedOffers.slice(0, maxOffersToScore)
    console.log(`[Unified Search] Scoring top ${offersToScore.length} offers`)

    let scoredOffers
    try {
      scoredOffers = await scoreFlightOffers(offersToScore, preferences)
      console.log(`[Unified Search] Scored ${scoredOffers.length} offers`)
    } catch (error) {
      console.error("[Unified Search] Scoring error:", error)
      // Continue with unscored offers if scoring fails
      scoredOffers = normalizedOffers.slice(0, 10).map((offer) => ({
        ...offer,
        score: 50,
        reasoning: "Scoring unavailable",
        match_details: {},
      }))
    }

    const topOffers = scoredOffers.slice(0, 10)

    const duration = Date.now() - startTime
    console.log(
      `[Unified Search] Completed in ${duration}ms: Returning top ${topOffers.length} offers`
    )
    console.log("[Unified Search] ========================================")

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
        search_errors: errors.length > 0 ? errors : undefined,
      },
      debug: {
        search_params_count: searchParamsArray.length,
        raw_results_count: allRawResults.length,
        normalized_count: normalizedOffers.length,
        duration_ms: duration,
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error("[Unified Search] Fatal error after", duration, "ms:", error)
    console.error("[Unified Search] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    console.log("[Unified Search] ========================================")
    
    return NextResponse.json(
      {
        error: "Internal server error",
        details:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        stack:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.stack
            : undefined,
      },
      { status: 500 }
    )
  }
}

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
import type { SerpApiFlightSearchParams } from "@/lib/types"
import { normalizeSerpApiResponse, normalizeFlightOffers } from "@/lib/normalize-flights"
import { extractPreferences } from "@/lib/llm-preferences"
import { scoreFlightOffers } from "@/lib/llm-scorer"
import { recommendDates } from "@/lib/llm-date-recommender"
import type { Holiday } from "@/lib/types"

const DEV_BYPASS_AUTH = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "1"

/**
 * Generate search parameters using LLM-recommended dates
 */
function generateSearchParamsWithDates(
  holiday: Holiday,
  dateRecommendations: Array<{ outbound_date: string; return_date: string; reasoning: string; priority: number }>
): SerpApiFlightSearchParams[] {
  const params: SerpApiFlightSearchParams[] = []
  
  // Collect origins
  const origins: string[] = []
  if (holiday.origins && holiday.origins.length > 0) {
    origins.push(...holiday.origins.filter((o) => o && o.trim()))
  } else if (holiday.origin && holiday.origin.trim()) {
    origins.push(holiday.origin.trim())
  }

  if (origins.length === 0) {
    throw new Error("No origins found in holiday data")
  }

  // Collect destinations
  const destinations = holiday.destinations || []
  if (destinations.length === 0) {
    throw new Error("No destinations found in holiday data")
  }

  // Generate search params for each origin-destination-date combination
  for (const origin of origins) {
    for (const destination of destinations) {
      for (const dateRec of dateRecommendations) {
        params.push({
          engine: "google_flights",
          departure_id: origin.trim(),
          arrival_id: destination.trim(),
          outbound_date: dateRec.outbound_date,
          return_date: dateRec.return_date,
          currency: "EUR",
          adults: 1,
          sort_by: 1, // Top flights
          num: 50,
        })
      }
    }
  }

  console.log(`[generateSearchParamsWithDates] Generated ${params.length} search params from ${dateRecommendations.length} date recommendations`)
  console.log(`[generateSearchParamsWithDates] Breakdown: ${origins.length} origins × ${destinations.length} destinations × ${dateRecommendations.length} dates`)
  return params
}

/**
 * Manual date fallback - generates dates across the range
 */
function generateManualDateFallback(holiday: Holiday): Array<{ outbound_date: string; return_date: string; reasoning: string; priority: number }> {
  const recommendations: Array<{ outbound_date: string; return_date: string; reasoning: string; priority: number }> = []
  const startDate = new Date(holiday.start_date)
  const endDate = new Date(holiday.end_date)
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  
  // Generate 8-10 date combinations across the range
  const numRecommendations = Math.min(10, Math.max(5, Math.floor(daysDiff / 7)))
  const minDuration = holiday.trip_duration_min || 3
  const maxDuration = holiday.trip_duration_max || 14
  const avgDuration = Math.floor((minDuration + maxDuration) / 2)
  
  for (let i = 0; i < numRecommendations; i++) {
    const progress = i / (numRecommendations - 1 || 1)
    const outboundDaysFromStart = Math.floor(daysDiff * progress * 0.7) // Use first 70% of range
    
    const outboundDate = new Date(startDate)
    outboundDate.setDate(outboundDate.getDate() + outboundDaysFromStart)
    
    // Prefer mid-week (Tuesday-Thursday = days 2-4)
    const currentWeekday = outboundDate.getDay()
    if (currentWeekday === 0 || currentWeekday === 6) {
      // If weekend, move to Tuesday
      const daysToTuesday = (2 - currentWeekday + 7) % 7
      outboundDate.setDate(outboundDate.getDate() + daysToTuesday)
    }
    
    const returnDate = new Date(outboundDate)
    returnDate.setDate(returnDate.getDate() + avgDuration)
    
    // Ensure dates are within range
    if (returnDate > endDate) {
      returnDate.setTime(endDate.getTime())
      const newOutbound = new Date(returnDate)
      newOutbound.setDate(newOutbound.getDate() - avgDuration)
      if (newOutbound >= startDate) {
        outboundDate.setTime(newOutbound.getTime())
      } else {
        continue // Skip this combination
      }
    }
    
    const outboundStr = outboundDate.toISOString().split("T")[0]
    const returnStr = returnDate.toISOString().split("T")[0]
    
    if (outboundStr < holiday.start_date || returnStr > holiday.end_date || returnStr <= outboundStr) {
      continue
    }
    
    recommendations.push({
      outbound_date: outboundStr,
      return_date: returnStr,
      reasoning: `Generated date combination ${i + 1} of ${numRecommendations}`,
      priority: 10 - i,
    })
  }
  
  return recommendations
}

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
    // STEP 2: Get Date Recommendations from LLM
    // ========================================================================
    console.log("[Unified Search] STEP 2: Getting date recommendations from LLM...")
    let dateRecommendations: Array<{ outbound_date: string; return_date: string; reasoning: string; priority: number }> = []
    
    try {
      dateRecommendations = await recommendDates({
        origin: holidayData.origin || holidayData.origins?.[0] || "",
        destinations: holidayData.destinations || [],
        start_date: holidayData.start_date,
        end_date: holidayData.end_date,
        budget: holidayData.budget,
        trip_duration_min: holidayData.trip_duration_min,
        trip_duration_max: holidayData.trip_duration_max,
        preferred_weekdays: holidayData.preferred_weekdays,
      })
      console.log("[Unified Search] LLM recommended", dateRecommendations.length, "date combinations")
      if (dateRecommendations.length > 0) {
        console.log("[Unified Search] Sample recommendations:", dateRecommendations.slice(0, 3).map(d => `${d.outbound_date} -> ${d.return_date}`))
      }
    } catch (error) {
      console.error("[Unified Search] Error getting date recommendations:", error)
      // Fallback will generate dates automatically
      console.log("[Unified Search] Will use fallback date generation")
    }
    
    // If no recommendations, generate fallback dates
    if (dateRecommendations.length === 0) {
      console.log("[Unified Search] No date recommendations, generating fallback dates...")
      const { recommendDates } = await import("@/lib/llm-date-recommender")
      try {
        dateRecommendations = await recommendDates({
          origin: holidayData.origin || holidayData.origins?.[0] || "",
          destinations: holidayData.destinations || [],
          start_date: holidayData.start_date,
          end_date: holidayData.end_date,
          budget: holidayData.budget,
          trip_duration_min: holidayData.trip_duration_min,
          trip_duration_max: holidayData.trip_duration_max,
          preferred_weekdays: holidayData.preferred_weekdays,
        })
        // If still empty, the fallback function inside recommendDates should have generated dates
        // But if it's still empty, we'll generate them manually
        if (dateRecommendations.length === 0) {
          dateRecommendations = generateManualDateFallback(holidayData)
        }
      } catch (fallbackError) {
        console.error("[Unified Search] Fallback also failed, generating dates manually:", fallbackError)
        dateRecommendations = generateManualDateFallback(holidayData)
      }
      console.log("[Unified Search] Generated", dateRecommendations.length, "date combinations (fallback)")
    }

    // ========================================================================
    // STEP 3: Generate Search Parameters (using recommended dates)
    // ========================================================================
    console.log("[Unified Search] STEP 3: Generating search parameters...")
    let searchParamsArray: ReturnType<typeof generateSearchParams>

    try {
      // Always use date recommendations if we have them, otherwise generate fallback dates
      if (dateRecommendations.length > 0) {
        // Generate search params for each recommended date combination
        searchParamsArray = generateSearchParamsWithDates(holidayData, dateRecommendations)
        console.log("[Unified Search] Generated", searchParamsArray.length, "search parameter sets using", dateRecommendations.length, "recommended dates")
        console.log("[Unified Search] Date range covered:", {
          earliest: dateRecommendations.map(d => d.outbound_date).sort()[0],
          latest: dateRecommendations.map(d => d.return_date).sort().reverse()[0],
        })
      } else {
        // This should not happen as we generate fallback dates above, but just in case
        console.warn("[Unified Search] No date recommendations available, using single date fallback")
        searchParamsArray = generateSearchParams(holidayData)
        console.log("[Unified Search] Generated", searchParamsArray.length, "search parameter sets (single date fallback)")
      }
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
    // STEP 4: Retrieval Layer - SerpApi
    // ========================================================================
    console.log("[Unified Search] STEP 4: Searching SerpApi with", searchParamsArray.length, "parameter sets...")
    
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
    // STEP 5: Normalization
    // ========================================================================
    console.log("[Unified Search] STEP 5: Normalizing results...")
    console.log("[Unified Search] Sample raw result structure:", allRawResults.length > 0 ? JSON.stringify(allRawResults[0], null, 2).substring(0, 1500) : "No results")
    
    // Get currency from search params (should be consistent across all searches)
    const requestCurrency = searchParamsArray[0]?.currency || "EUR"
    let normalizedOffers = normalizeFlightOffers(allRawResults, "serpapi", requestCurrency)
    
    // Filter out flights that don't match trip duration requirements
    if (holidayData.trip_duration_min || holidayData.trip_duration_max) {
      const minDuration = holidayData.trip_duration_min || 0
      const maxDuration = holidayData.trip_duration_max || 999
      
      const beforeFilter = normalizedOffers.length
      normalizedOffers = normalizedOffers.filter((offer) => {
        // Calculate trip duration from first departure to last arrival
        if (offer.segments.length === 0) return false
        
        const firstDeparture = new Date(offer.segments[0].departure)
        const lastArrival = new Date(offer.segments[offer.segments.length - 1].arrival)
        const tripDurationDays = Math.ceil((lastArrival.getTime() - firstDeparture.getTime()) / (1000 * 60 * 60 * 24))
        
        const matches = tripDurationDays >= minDuration && tripDurationDays <= maxDuration
        
        if (!matches) {
          console.log(`[Unified Search] Filtered out flight: trip duration ${tripDurationDays} days (required: ${minDuration}-${maxDuration})`)
        }
        
        return matches
      })
      
      console.log(`[Unified Search] Filtered ${beforeFilter - normalizedOffers.length} flights that didn't match trip duration (${minDuration}-${maxDuration} days)`)
    }

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
    // STEP 6: LLM Scoring
    // ========================================================================
    console.log("[Unified Search] STEP 6: Scoring offers with LLM...")

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

    // ========================================================================
    // STEP 7: Save flights to database
    // ========================================================================
    console.log("[Unified Search] STEP 7: Saving flights to database...")
    
    // Delete old flights for this holiday first
    await supabase.from("flights").delete().eq("holiday_id", id)
    
    // Save new flights - only save flights that match trip duration
    const flightsToSave = topOffers
      .filter((offer) => {
        // Double-check trip duration before saving
        if (holidayData.trip_duration_min || holidayData.trip_duration_max) {
          const minDuration = holidayData.trip_duration_min || 0
          const maxDuration = holidayData.trip_duration_max || 999
          
          if (offer.segments.length === 0) return false
          
          const firstDeparture = new Date(offer.segments[0].departure)
          const lastArrival = new Date(offer.segments[offer.segments.length - 1].arrival)
          const tripDurationDays = Math.ceil((lastArrival.getTime() - firstDeparture.getTime()) / (1000 * 60 * 60 * 24))
          
          return tripDurationDays >= minDuration && tripDurationDays <= maxDuration
        }
        return true
      })
      .map((offer) => {
        // Get first and last segments for dates
        const firstSegment = offer.segments[0]
        const lastSegment = offer.segments[offer.segments.length - 1]
        
        // Extract dates from segments
        const departureDate = firstSegment?.departure ? new Date(firstSegment.departure).toISOString().split("T")[0] : null
        const returnDate = lastSegment?.arrival ? new Date(lastSegment.arrival).toISOString().split("T")[0] : null
        
        // Get origin and destination from segments
        const origin = firstSegment?.from?.code || holidayData.origin || ""
        const destination = lastSegment?.to?.code || (holidayData.destinations?.[0] || "")
        
        // Get airline from first segment
        const airline = firstSegment?.airline?.name || "Unknown"
        
        return {
          holiday_id: id,
          origin,
          destination,
          departure_date: departureDate || holidayData.start_date,
          return_date: returnDate || holidayData.end_date,
          price: offer.price.total,
          airline,
          booking_link: offer.booking_link || null,
          last_checked: new Date().toISOString(),
        }
      })
      .filter(f => f.departure_date && f.return_date) // Only save flights with valid dates

    if (flightsToSave.length > 0) {
      const { error: saveError } = await supabase
        .from("flights")
        .insert(flightsToSave)
      
      if (saveError) {
        console.error("[Unified Search] Error saving flights:", saveError)
      } else {
        console.log(`[Unified Search] Saved ${flightsToSave.length} flights to database`)
      }
    }

    // Update holiday with last search timestamp
    await supabase
      .from("holidays")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id)

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
        saved_to_db: flightsToSave.length,
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

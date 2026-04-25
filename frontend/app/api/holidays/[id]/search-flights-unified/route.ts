/**
 * Unified Flight Search API Route
 * 
 * Implements the full pipeline: Retrieval → Normalization → Reasoning
 * 
 * Supports dev-mode auth bypass via NEXT_PUBLIC_DEV_BYPASS_AUTH="1"
 */

import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { searchFlightsParallel, generateSearchParams, hasSerpApiKeys } from "@/lib/serpapi"
import type { SerpApiFlightSearchParams, FlightOffer } from "@/lib/types"
import { normalizeSerpApiResponse, normalizeFlightOffers, type SearchContext } from "@/lib/normalize-flights"
import { extractPreferences } from "@/lib/llm-preferences"
import { scoreFlightOffers } from "@/lib/llm-scorer"
import { expandCityAirport } from "@/lib/airports"
import type { Holiday } from "@/lib/types"
import {
  generateFlexibleDateCandidates,
  hashStringToSeed,
  type DateAnchor,
} from "@/lib/flexible-date-explorer"
import { filterDateCandidates } from "@/lib/llm-candidate-filter"
import { emitUserThought, type ThoughtStreamCallback } from "@/lib/ai-thought-stream"

const DEV_BYPASS_AUTH = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "1"

// Increase timeout for this route since it performs multiple LLM calls and SerpAPI requests
// Vercel Pro plan allows up to 300 seconds (5 minutes)
export const maxDuration = 300

/**
 * ISO-8601 week key (e.g. "2026-W17") for the given date. Used to derive a
 * deterministic seed that rolls over once per week — searches within the same
 * week return the same candidates; the next week naturally re-explores.
 */
function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  // ISO week: Thursday in current week decides the year.
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`
}

/**
 * Pull recent flight saves for this holiday and surface the (up to) 3 cheapest
 * depart dates as anchors. Weight is inverse rank, so the cheapest gets pulled
 * to most strongly. Silent failure: a missing/empty table just yields no anchors.
 */
async function loadAnchorsForHoliday(
  supabase: Awaited<ReturnType<typeof createClient>>,
  holidayId: string
): Promise<DateAnchor[]> {
  try {
    const { data } = await supabase
      .from("flights")
      .select("departure_date, price")
      .eq("holiday_id", holidayId)
      .order("price", { ascending: true })
      .limit(3)
    if (!data || data.length === 0) return []
    const seen = new Set<string>()
    const anchors: DateAnchor[] = []
    for (let i = 0; i < data.length; i++) {
      const d = data[i].departure_date as string | null | undefined
      if (!d || seen.has(d)) continue
      seen.add(d)
      anchors.push({ depart_date: d, weight: data.length - i })
    }
    return anchors
  } catch (err) {
    console.warn("[Unified Search] loadAnchorsForHoliday failed:", err)
    return []
  }
}

/**
 * Generate search parameters using optimized dates (max 5 SerpAPI calls)
 * Intelligently selects origin-destination-date combinations to stay within the limit.
 */
function generateSearchParamsWithDates(
  holiday: Holiday,
  dateRecommendations: Array<{ outbound_date: string; return_date: string; reasoning: string; priority: number }>,
  origins: string[],
  destinations: string[],
  maxSerpApiCalls: number = 5
): SerpApiFlightSearchParams[] {
  const params: SerpApiFlightSearchParams[] = []
  
  // Calculate total possible combinations
  const totalCombinations = origins.length * destinations.length * dateRecommendations.length
  
  console.log(`[generateSearchParamsWithDates] Total possible combinations: ${totalCombinations}`)
  console.log(`[generateSearchParamsWithDates] Max allowed SerpAPI calls: ${maxSerpApiCalls}`)
  
  // Strategy: Prioritize highest priority dates and most important routes
  // If we have more combinations than allowed, we need to intelligently select
  
  if (totalCombinations <= maxSerpApiCalls) {
    // We can search all combinations
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
  } else {
    // We need to select intelligently
    // Priority: Highest priority dates first, then distribute across routes
    const sortedDates = [...dateRecommendations].sort((a, b) => b.priority - a.priority)
    
    // Create all possible combinations
    const allCombinations: Array<{
      origin: string
      destination: string
      date: typeof dateRecommendations[0]
      priority: number
    }> = []
    
    for (const origin of origins) {
      for (const destination of destinations) {
        for (const dateRec of sortedDates) {
          allCombinations.push({
            origin,
            destination,
            date: dateRec,
            priority: dateRec.priority,
          })
        }
      }
    }
    
    // Sort by priority (highest first)
    allCombinations.sort((a, b) => b.priority - a.priority)
    
    // Select top N combinations, ensuring we cover different routes
    const selectedCombinations = new Set<string>()
    const selected: typeof allCombinations = []
    
    for (const combo of allCombinations) {
      if (selected.length >= maxSerpApiCalls) break
      
      // Prioritize: highest priority dates, then diversify routes
      const key = `${combo.origin}-${combo.destination}-${combo.date.outbound_date}`
      if (!selectedCombinations.has(key)) {
        selectedCombinations.add(key)
        selected.push(combo)
      }
    }
    
    // If we still have slots, fill with remaining high-priority combinations
    for (const combo of allCombinations) {
      if (selected.length >= maxSerpApiCalls) break
      
      const key = `${combo.origin}-${combo.destination}-${combo.date.outbound_date}`
      if (!selectedCombinations.has(key)) {
        selectedCombinations.add(key)
        selected.push(combo)
      }
    }
    
    // Generate params from selected combinations
    for (const combo of selected) {
      params.push({
        engine: "google_flights",
        departure_id: combo.origin.trim(),
        arrival_id: combo.destination.trim(),
        outbound_date: combo.date.outbound_date,
        return_date: combo.date.return_date,
        currency: "EUR",
        adults: 1,
        sort_by: 1,
        num: 50,
      })
    }
    
    console.log(`[generateSearchParamsWithDates] Selected ${params.length} combinations from ${totalCombinations} possible`)
  }

  console.log(`[generateSearchParamsWithDates] Generated ${params.length} search params`)
  console.log(`[generateSearchParamsWithDates] Origins: ${origins.join(", ")}`)
  console.log(`[generateSearchParamsWithDates] Destinations: ${destinations.join(", ")}`)
  console.log(`[generateSearchParamsWithDates] Date pairs: ${dateRecommendations.length}`)
  
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
    if (!hasSerpApiKeys()) {
      console.error("[Unified Search] No SerpAPI keys configured")
      return NextResponse.json(
        {
          code: "SERPAPI_CREDITS_EXHAUSTED",
          error: "SerpApi API key not configured",
          details: "SERPAPI_KEYS environment variable is missing",
          suggestion: "Please set SERPAPI_KEYS in your .env.local file",
        },
        { status: 503 }
      )
    }
    console.log("[Unified Search] SerpApi keys configured")

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
    // STEP 2: Flexible date exploration + candidate scoring
    // ========================================================================
    console.log("[Unified Search] STEP 2: Flexible date exploration + candidate scoring...")
    
    // Collect origins (use first origin for now, can expand to multiple later)
    const origins: string[] = []
    if (holidayData.origins && holidayData.origins.length > 0) {
      for (const origin of holidayData.origins.filter((o) => o && o.trim())) {
        const expanded = expandCityAirport(origin.trim())
        origins.push(...expanded)
      }
    } else if (holidayData.origin && holidayData.origin.trim()) {
      const expanded = expandCityAirport(holidayData.origin.trim())
      origins.push(...expanded)
    }

    // Collect destinations
    const destinationCodes = holidayData.destinations || []
    const destinations: string[] = []
    for (const dest of destinationCodes) {
      const expanded = expandCityAirport(dest.trim())
      destinations.push(...expanded)
    }

    if (origins.length === 0 || destinations.length === 0) {
      return NextResponse.json(
        {
          error: "Invalid holiday data",
          details: "Please provide at least one origin and one destination",
        },
        { status: 400 }
      )
    }

    // Collect AI thoughts for user feedback
    const aiThoughts: string[] = []
    const thoughtCallback: ThoughtStreamCallback = (thought: string) => {
      aiThoughts.push(thought)
      console.log(`[AI Thought] ${thought}`)
    }

    const tripLengthMin = holidayData.trip_duration_min || 3
    const tripLengthMax = holidayData.trip_duration_max || 14

    // Declare variables at function scope for access in response
    let filteredCandidates: Array<{
      depart_date: string
      return_date: string
      score: number
      reasoning: string
    }> = []
    
    let dateCandidates: Array<{
      depart_date: string
      return_date: string
      trip_length_days: number
      start_date_position: "early" | "mid" | "late"
    }> = []

    // STEP 2a: Generate flexible date candidates.
    emitUserThought(thoughtCallback, `Exploring flexible date combinations across your travel window...`)

    // Phase 4 — pull historical anchors from previous flight saves so the next
    // search clusters part of its budget around dates we already know surface
    // cheap fares. We also derive a seed keyed off the holiday + ISO week so
    // searches within the same week return identical candidates (stable price-
    // tracking deltas) but week-over-week we naturally re-explore.
    const anchors = await loadAnchorsForHoliday(supabase, id)
    const seed = hashStringToSeed(`${id}:${isoWeekKey(new Date())}`)
    if (anchors.length > 0) {
      emitUserThought(
        thoughtCallback,
        `Anchoring around ${anchors.length} previously-cheap depart date${anchors.length > 1 ? "s" : ""} from this holiday's history.`
      )
    }

    dateCandidates = generateFlexibleDateCandidates({
      start_date: holidayData.start_date,
      end_date: holidayData.end_date,
      trip_length_min: tripLengthMin,
      trip_length_max: tripLengthMax,
      target_candidates: 30,
      seed,
      anchors,
    })

    console.log(`[Unified Search] Generated ${dateCandidates.length} flexible date candidates`)
    emitUserThought(
      thoughtCallback,
      `Generated ${dateCandidates.length} diverse date combinations across your travel window.`
    )

    emitUserThought(thoughtCallback, "Evaluating trip lengths between " + tripLengthMin + "-" + tripLengthMax + " days...")

    // STEP 2b: Filter candidates using OpenAI to select top 5-7
    emitUserThought(thoughtCallback, "Comparing date options to find the best price potential...")
    
    try {
      // Filter date candidates using OpenAI to select top 5-7
      filteredCandidates = await filterDateCandidates({
        candidates: dateCandidates,
        origin_airports: origins,
        destination_airports: destinations,
        start_date: holidayData.start_date,
        end_date: holidayData.end_date,
        trip_length_min: tripLengthMin,
        trip_length_max: tripLengthMax,
        budget: holidayData.budget,
        preferences: {
          budget_sensitivity: holidayData.budget ? "high" : "medium",
          flexibility: "moderate",
          preferred_weekdays: holidayData.preferred_weekdays,
        },
        thoughtCallback,
      })

      console.log(
        `[Unified Search] Filtered to ${filteredCandidates.length} top candidates`
      )
      if (filteredCandidates.length > 0) {
        console.log(
          "[Unified Search] Top candidates:",
          filteredCandidates.map(
            (c) => `${c.depart_date} → ${c.return_date} (score: ${c.score})`
          )
        )
      }
    } catch (error) {
      console.error("[Unified Search] Error filtering candidates:", error)
      emitUserThought(thoughtCallback, "Using intelligent date selection based on your preferences...")
      
      // Fallback: select diverse candidates manually
      const byPosition = {
        early: dateCandidates.filter(c => c.start_date_position === "early"),
        mid: dateCandidates.filter(c => c.start_date_position === "mid"),
        late: dateCandidates.filter(c => c.start_date_position === "late"),
      }

      const fallbackSelected: typeof filteredCandidates = []
      const seen = new Set<string>()

      // Select from each position
      for (const [position, candidates] of Object.entries(byPosition)) {
        if (candidates.length > 0 && fallbackSelected.length < 7) {
          const candidate = candidates[Math.floor(Math.random() * candidates.length)]
          const key = `${candidate.depart_date}:${candidate.return_date}`
          if (!seen.has(key)) {
            fallbackSelected.push({
              depart_date: candidate.depart_date,
              return_date: candidate.return_date,
              score: 65,
              reasoning: `Diverse selection: ${candidate.trip_length_days}-day trip in ${position} date range`,
            })
            seen.add(key)
          }
        }
      }

      // Fill remaining with diverse trip lengths
      const byTripLength = new Map<number, typeof dateCandidates>()
      dateCandidates.forEach(c => {
        const existing = byTripLength.get(c.trip_length_days) || []
        existing.push(c)
        byTripLength.set(c.trip_length_days, existing)
      })

      for (const [length, candidates] of byTripLength.entries()) {
        if (fallbackSelected.length >= 7) break
        if (candidates.length > 0) {
          const candidate = candidates[Math.floor(Math.random() * candidates.length)]
          const key = `${candidate.depart_date}:${candidate.return_date}`
          if (!seen.has(key)) {
            fallbackSelected.push({
              depart_date: candidate.depart_date,
              return_date: candidate.return_date,
              score: 60,
              reasoning: `${length}-day trip option`,
            })
            seen.add(key)
          }
        }
      }

      filteredCandidates = fallbackSelected.slice(0, 10)
    }

    // Ensure we have at least one candidate
    if (filteredCandidates.length === 0) {
      console.warn("[Unified Search] No candidates selected, using fallback")
      emitUserThought(thoughtCallback, "Generating date options...")
      
      if (dateCandidates.length > 0) {
        const firstCandidate = dateCandidates[0]
        filteredCandidates = [{
          depart_date: firstCandidate.depart_date,
          return_date: firstCandidate.return_date,
          score: 50,
          reasoning: "Fallback candidate",
        }]
      } else {
        // Ultimate fallback
        const fallbackDates = generateManualDateFallback(holidayData)
        if (fallbackDates.length > 0) {
          filteredCandidates = [{
            depart_date: fallbackDates[0].outbound_date,
            return_date: fallbackDates[0].return_date,
            score: 50,
            reasoning: "Fallback date generation",
          }]
        }
      }
    }

    emitUserThought(
      thoughtCallback,
      `Selected ${filteredCandidates.length} optimal date combinations for real-time price search.`
    )

    // Build search-cell budget. Each "cell" = (origin, destination, depart_date, return_date)
    // and consumes one SerpAPI call. Diversity is enforced by *generation*, not by re-sorting
    // here — we trust the upstream scoring and take the top-N by score.
    const sortedByScore = [...filteredCandidates].sort((a, b) => b.score - a.score)
    const dateRecommendations: Array<{
      outbound_date: string
      return_date: string
      reasoning: string
      priority: number
      origin: string
      destination: string
    }> = []
    const cellSeen = new Set<string>()
    const MAX_SERPAPI_CALLS = 5

    // Round-robin across origins AND destinations as we descend the score list, so the
    // budget is spread across both axes without losing the score ordering.
    let routeIdx = 0
    const routeCount = origins.length * destinations.length
    for (const candidate of sortedByScore) {
      if (dateRecommendations.length >= MAX_SERPAPI_CALLS) break
      // Try every route slot for this candidate, picking the next un-used cell.
      for (let r = 0; r < routeCount; r++) {
        const slot = (routeIdx + r) % routeCount
        const origin = origins[Math.floor(slot / destinations.length)]
        const destination = destinations[slot % destinations.length]
        const key = `${origin}-${destination}-${candidate.depart_date}-${candidate.return_date}`
        if (cellSeen.has(key)) continue
        cellSeen.add(key)
        dateRecommendations.push({
          outbound_date: candidate.depart_date,
          return_date: candidate.return_date,
          reasoning: candidate.reasoning,
          priority: candidate.score,
          origin,
          destination,
        })
        routeIdx = slot + 1
        break
      }
    }

    console.log(
      `[Unified Search] Built ${dateRecommendations.length} (origin,destination,date) cells from top-scored candidates`
    )
    const distribution = dateRecommendations.reduce((acc, rec) => {
      const k = `${rec.origin}->${rec.destination}`
      acc[k] = (acc[k] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    console.log(`[Unified Search] Route distribution:`, distribution)
    console.log(
      `[Unified Search] Trip lengths:`,
      dateRecommendations
        .map((r) =>
          Math.ceil(
            (new Date(r.return_date).getTime() - new Date(r.outbound_date).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
        .join(", "),
      "days"
    )

    // ========================================================================
    // STEP 3: Generate Search Parameters (TOP 5-7 from Flexible Date Explorer)
    // ========================================================================
    console.log("[Unified Search] STEP 3: Generating search parameters from flexible date candidates...")
    let searchParamsArray: SerpApiFlightSearchParams[] = []

    try {
      if (dateRecommendations.length > 0) {
        searchParamsArray = dateRecommendations.slice(0, MAX_SERPAPI_CALLS).map((rec) => ({
          engine: "google_flights" as const,
          departure_id: rec.origin.trim(),
          arrival_id: rec.destination.trim(),
          outbound_date: rec.outbound_date,
          return_date: rec.return_date,
          currency: "EUR",
          adults: 1,
          sort_by: 1, // Top flights
          num: 50,
        }))

        console.log("[Unified Search] Generated", searchParamsArray.length, "search parameter sets")
        console.log(
          "[Unified Search] Cells:",
          dateRecommendations
            .map((r) => `${r.origin}→${r.destination} ${r.outbound_date}/${r.return_date}`)
            .join(", ")
        )
      } else {
        console.warn("[Unified Search] No date recommendations, using fallback")
        if (destinations.length > 0 && origins.length > 0) {
          const fallbackCandidates = generateFlexibleDateCandidates({
            start_date: holidayData.start_date,
            end_date: holidayData.end_date,
            trip_length_min: tripLengthMin,
            trip_length_max: tripLengthMax,
            target_candidates: 5,
          })

          searchParamsArray = fallbackCandidates
            .slice(0, MAX_SERPAPI_CALLS)
            .map((candidate, i) => ({
              engine: "google_flights" as const,
              departure_id: origins[i % origins.length].trim(),
              arrival_id: destinations[i % destinations.length].trim(),
              outbound_date: candidate.depart_date,
              return_date: candidate.return_date,
              currency: "EUR",
              adults: 1,
              sort_by: 1,
              num: 50,
            }))
        } else {
          searchParamsArray = generateSearchParams(holidayData).slice(0, MAX_SERPAPI_CALLS)
        }
        console.log("[Unified Search] Generated", searchParamsArray.length, "search parameter sets (fallback)")
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
    // STEP 4: Retrieval Layer - SerpApi (Phase 2)
    // ========================================================================
    console.log("[Unified Search] STEP 4: Searching SerpApi (Phase 2) with", searchParamsArray.length, "parameter sets...")
    console.log("[Unified Search] Phase 2: Using only optimized dates from Phase 1, ensuring max 5 SerpAPI calls")
    
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
      const msg = error instanceof Error ? error.message : String(error)
      const isCreditsExhausted =
        msg.includes("quota") ||
        msg.includes("Quota") ||
        msg.includes("SERPAPI_KEYS") ||
        msg.includes("not configured")
      return NextResponse.json(
        {
          ...(isCreditsExhausted && { code: "SERPAPI_CREDITS_EXHAUSTED" as const }),
          error: "Flight search failed",
          details: msg,
          suggestion: isCreditsExhausted
            ? "API credits are exhausted. You can support the project or get notified when search is back."
            : "Please check your SERPAPI_KEYS environment variable",
        },
        { status: isCreditsExhausted ? 503 : 500 }
      )
    }

    // Collect all raw results and normalize per-search with correct return dates
    const allRawResults: any[] = []
    let normalizedOffers: FlightOffer[] = []
    const errors: Array<{ params: any; error: string }> = []
    // SerpAPI returns a `price_insights` object on each Google Flights response
    // with lowest/typical price ranges and a price_level enum. Capture it for
    // observability + future memory-based exploration (Phase 4).
    const priceInsights: Array<{
      origin: string
      destination: string
      outbound_date: string
      return_date: string
      price_level?: string
      lowest_price?: number
      typical_range?: [number, number]
    }> = []
    
    // Get currency from search params (should be consistent across all searches)
    const requestCurrency = searchParamsArray[0]?.currency || "EUR"

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

        // Capture price_insights when present — this is genuine pricing signal
        // from Google (not LLM speculation) and feeds Phase 4's exploration memory.
        const pi = result.result.price_insights
        if (pi && typeof pi === "object") {
          priceInsights.push({
            origin: result.params.departure_id,
            destination: result.params.arrival_id,
            outbound_date: result.params.outbound_date || "",
            return_date: result.params.return_date || "",
            price_level: pi.price_level,
            lowest_price: typeof pi.lowest_price === "number" ? pi.lowest_price : undefined,
            typical_range:
              Array.isArray(pi.typical_price_range) && pi.typical_price_range.length === 2
                ? [pi.typical_price_range[0], pi.typical_price_range[1]]
                : undefined,
          })
          if (pi.price_level) {
            emitUserThought(
              thoughtCallback,
              `${result.params.departure_id}→${result.params.arrival_id} on ${result.params.outbound_date}: prices look ${pi.price_level}.`
            )
          }
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
          
          // Check if parent response has source/deep_link info we should attach
          const parentSource = result.result.source || result.result.source_name
          const parentDeepLink = result.result.deep_link || result.result.link
          
          // Attach parent-level booking info to each flight if not present
          const flightsWithSource = flights.map((flight: any) => {
            if (!flight.source && parentSource) {
              flight.source = parentSource
            }
            if (!flight.deep_link && !flight.link && parentDeepLink) {
              flight.deep_link = parentDeepLink
            }
            return flight
          })
          
          allRawResults.push(...flightsWithSource)
          
          // Normalize this batch with the correct search context (return date)
          // This ensures Google Flights URLs have the correct return date for round-trip searches
          const searchContext: SearchContext = {
            outbound_date: result.params.outbound_date,
            return_date: result.params.return_date,
          }
          console.log("[Unified Search] Normalizing batch with search context:", searchContext)
          
          const batchOffers = normalizeFlightOffers(flightsWithSource, "serpapi", requestCurrency, searchContext)
          normalizedOffers.push(...batchOffers)
        } else {
          console.warn("[Unified Search] No flights in result for route:", result.params.departure_id, "->", result.params.arrival_id)
          console.warn("[Unified Search] Result data:", JSON.stringify(result.result, null, 2).substring(0, 500))
        }
      } else {
        console.warn("[Unified Search] No result object for route:", result.params.departure_id, "->", result.params.arrival_id)
      }
    }

    console.log(`[Unified Search] Retrieved ${allRawResults.length} raw flight results`)
    console.log(`[Unified Search] Normalized ${normalizedOffers.length} offers with correct return dates`)
    if (errors.length > 0) {
      console.warn("[Unified Search] Some searches failed:", errors.length)
    }

    // ========================================================================
    // STEP 5: Normalization (already done per-batch above)
    // ========================================================================
    console.log("[Unified Search] STEP 5: Normalization complete (done per-batch with correct return dates)")
    console.log("[Unified Search] Sample raw result structure:", allRawResults.length > 0 ? JSON.stringify(allRawResults[0], null, 2).substring(0, 1500) : "No results")
    
    // Filter out flights that don't match trip duration requirements
    if (holidayData.trip_duration_min || holidayData.trip_duration_max) {
      const minDuration = holidayData.trip_duration_min || 0
      const maxDuration = holidayData.trip_duration_max || 999
      
      const beforeFilter = normalizedOffers.length
      
      // Create a map to match offers to their search params by matching outbound date
      const outboundDateToReturnDate = new Map<string, string>()
      for (const params of searchParamsArray) {
        if (params.outbound_date && params.return_date) {
          outboundDateToReturnDate.set(params.outbound_date, params.return_date)
        }
      }
      
      normalizedOffers = normalizedOffers.filter((offer) => {
        if (offer.segments.length === 0) return false
        
        // For round-trip flights, calculate trip duration from outbound departure to return_date
        const firstDeparture = new Date(offer.segments[0].departure)
        const outboundDateStr = firstDeparture.toISOString().split("T")[0]
        
        // Try to find matching return_date from search params
        const returnDateStr = outboundDateToReturnDate.get(outboundDateStr)
        
        let tripDurationDays = 0
        
        if (returnDateStr) {
          // Use return_date from search params for round-trip flights
          const returnDate = new Date(returnDateStr)
          tripDurationDays = Math.ceil((returnDate.getTime() - firstDeparture.getTime()) / (1000 * 60 * 60 * 24))
          console.log(
            `[Unified Search] Round-trip duration: ${outboundDateStr} to ${returnDateStr} = ${tripDurationDays} days`
          )
        } else {
          // Fallback: calculate from segments (for one-way flights or if no match)
          const lastArrival = new Date(offer.segments[offer.segments.length - 1].arrival)
          tripDurationDays = Math.ceil((lastArrival.getTime() - firstDeparture.getTime()) / (1000 * 60 * 60 * 24))
          console.log(
            `[Unified Search] One-way/fallback duration: ${outboundDateStr} to ${lastArrival.toISOString().split("T")[0]} = ${tripDurationDays} days`
          )
        }
        
        const matches = tripDurationDays >= minDuration && tripDurationDays <= maxDuration
        
        if (!matches) {
          console.log(
            `[Unified Search] Filtered out flight: trip duration ${tripDurationDays} days (required: ${minDuration}-${maxDuration})`
          )
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
      
      const isCreditsExhaustedResponse = errors.length > 0 && (() => {
        const firstError = errors[0]
        return (
          firstError.error.includes("SERPAPI_KEYS") ||
          firstError.error.includes("SERPAPI_KEY") ||
          firstError.error.includes("quota") ||
          firstError.error.includes("Quota")
        )
      })()
      if (errors.length > 0) {
        const firstError = errors[0]
        if (firstError.error.includes("SERPAPI_KEYS") || firstError.error.includes("SERPAPI_KEY")) {
          errorMessage = "SerpApi API key is not configured"
          suggestion = "Please set SERPAPI_KEYS in your environment variables"
        } else if (firstError.error.includes("401") || firstError.error.includes("Unauthorized")) {
          errorMessage = "SerpApi authentication failed"
          suggestion = "Please check your SERPAPI_KEYS are valid"
        } else if (firstError.error.includes("quota") || firstError.error.includes("Quota")) {
          errorMessage = "SerpApi quota exceeded on all keys"
          suggestion = "All API keys are exhausted. You can support the project or get notified when search is back."
        } else if (firstError.error.includes("rate limit") || firstError.error.includes("Rate limit") || firstError.error.includes("429")) {
          errorMessage = "SerpApi rate limit exceeded (temporary)"
          suggestion = "Please wait a moment and try again."
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
        ...(isCreditsExhaustedResponse && { code: "SERPAPI_CREDITS_EXHAUSTED" as const }),
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

    // Score all normalized offers (or up to 100 if there are too many)
    // With 5 SerpAPI calls returning 50 results each, we could have up to 250 offers
    const maxOffersToScore = Math.min(normalizedOffers.length, 100)
    const offersToScore = normalizedOffers.slice(0, maxOffersToScore)
    console.log(`[Unified Search] Scoring ${offersToScore.length} offers (out of ${normalizedOffers.length} total)`)

    let scoredOffers
    try {
      scoredOffers = await scoreFlightOffers(offersToScore, preferences)
      console.log(`[Unified Search] Scored ${scoredOffers.length} offers`)
    } catch (error) {
      console.error("[Unified Search] Scoring error:", error)
      // Continue with unscored offers if scoring fails - use all normalized offers
      scoredOffers = normalizedOffers.slice(0, maxOffersToScore).map((offer) => ({
        ...offer,
        score: 50,
        reasoning: "Scoring unavailable",
        match_details: {},
      }))
    }

    // Sort by score (highest first) and use all scored offers (no limit)
    // If scoring failed, sort by price (lowest first)
    const sortedOffers = scoredOffers.sort((a, b) => {
      if (a.score !== undefined && b.score !== undefined) {
        return b.score - a.score // Higher score first
      }
      // Fallback: sort by price (lower is better)
      return (a.price.total || 0) - (b.price.total || 0)
    })

    // Use all sorted offers - no limit
    const topOffers = sortedOffers

    const duration = Date.now() - startTime
    console.log(
      `[Unified Search] Completed in ${duration}ms: Returning ${topOffers.length} offers (out of ${normalizedOffers.length} normalized)`
    )
    console.log(`[Unified Search] Top offers details:`, topOffers.map(o => ({
      id: o.id,
      price: o.price.total,
      segments: o.segments.length,
      firstDeparture: o.segments[0]?.departure,
      lastArrival: o.segments[o.segments.length - 1]?.arrival,
    })))

    // ========================================================================
    // STEP 7: Save flights to database
    // ========================================================================
    console.log("[Unified Search] STEP 7: Saving flights to database...")
    console.log(`[Unified Search] Top offers before saving: ${topOffers.length}`)
    console.log(`[Unified Search] Search params array length: ${searchParamsArray.length}`)
    if (searchParamsArray.length > 0) {
      console.log(`[Unified Search] Sample search param:`, {
        outbound_date: searchParamsArray[0].outbound_date,
        return_date: searchParamsArray[0].return_date,
        departure_id: searchParamsArray[0].departure_id,
        arrival_id: searchParamsArray[0].arrival_id,
      })
    }
    
    // Delete old flights for this holiday first
    const { count: deletedCount } = await supabase.from("flights").delete().eq("holiday_id", id).select("*", { count: "exact", head: true })
    console.log(`[Unified Search] Deleted ${deletedCount || 0} old flights`)
    
    // Save new flights - map offers to flight records with correct return_date
    const flightsToSave = topOffers
      .map((offer) => {
        // Get first and last segments for dates
        const firstSegment = offer.segments[0]
        const lastSegment = offer.segments[offer.segments.length - 1]
        
        // Extract departure date from first segment
        const departureDate = firstSegment?.departure ? new Date(firstSegment.departure).toISOString().split("T")[0] : null
        
        // Get origin and destination from segments (needed for matching)
        const origin = firstSegment?.from?.code || holidayData.origin || ""
        const destination = lastSegment?.to?.code || (holidayData.destinations?.[0] || "")
        
        // Match offer to search params to get correct return_date
        const outboundDateStr = departureDate
        let returnDate: string | null = null
        
        // Try to find matching search params - prioritize origin/destination match
        for (const params of searchParamsArray) {
          const paramsOutboundDate = params.outbound_date
          const paramsOrigin = params.departure_id
          const paramsDest = params.arrival_id
          
          // Match by origin/destination first (more reliable)
          if (paramsOrigin === origin && paramsDest === destination && params.return_date) {
            // If dates match exactly, use that return_date
            if (paramsOutboundDate === outboundDateStr) {
              returnDate = params.return_date
              console.log(`[Unified Search] Matched return_date ${returnDate} for ${origin}->${destination} on ${outboundDateStr}`)
              break
            }
            // If dates are close (within 2 days), still use the return_date
            if (!returnDate) {
              const offerDate = new Date(outboundDateStr || "")
              const paramDate = new Date(paramsOutboundDate || "")
              const daysDiff = Math.abs((offerDate.getTime() - paramDate.getTime()) / (1000 * 60 * 60 * 24))
              
              if (daysDiff <= 2) {
                returnDate = params.return_date
                console.log(`[Unified Search] Matched return_date ${returnDate} by origin/dest (date diff: ${daysDiff} days)`)
                break
              }
            }
          }
        }
        
        // If still no match, try matching by date only
        if (!returnDate) {
          for (const params of searchParamsArray) {
            if (params.outbound_date === outboundDateStr && params.return_date) {
              returnDate = params.return_date
              console.log(`[Unified Search] Matched return_date ${returnDate} by date only for ${outboundDateStr}`)
              break
            }
          }
        }
        
        // Fallback: if no match, use last segment arrival (for one-way flights)
        if (!returnDate && lastSegment?.arrival) {
          returnDate = new Date(lastSegment.arrival).toISOString().split("T")[0]
          console.log(`[Unified Search] Using last segment arrival as return_date: ${returnDate}`)
        }
        
        // Final fallback: use holiday end_date
        if (!returnDate) {
          returnDate = holidayData.end_date
          console.log(`[Unified Search] Using holiday end_date as return_date: ${returnDate}`)
        }
        
        // Get airline from first segment
        const airline = firstSegment?.airline?.name || "Unknown"
        
        // Ensure deal_url is set - use booking_link as fallback
        const dealUrl = offer.deal_url || offer.booking_link || null
        
        // Calculate flight duration string
        const totalMinutes = offer.total_duration_minutes || 0
        const hours = Math.floor(totalMinutes / 60)
        const mins = totalMinutes % 60
        const flightDuration = totalMinutes > 0 ? `${hours}h ${mins}m` : undefined
        
        // Build extended flight details for storage
        const flightDetails = offer.flight_details ? {
          ...offer.flight_details,
          // Add carbon emissions if available
          carbon_emissions: offer.carbon_emissions ? 
            `${offer.carbon_emissions.this_flight || 0}kg CO₂` : undefined,
        } : undefined
        
        return {
          holiday_id: id,
          origin,
          destination,
          departure_date: departureDate || holidayData.start_date,
          return_date: returnDate,
          price: offer.price.total,
          airline,
          booking_link: offer.booking_link || null,
          deal_url: dealUrl,
          provider: offer.provider || "serpapi",
          layovers: offer.num_stops,
          flight_duration: flightDuration,
          flight_details: flightDetails,
          last_checked: new Date().toISOString(),
        }
      })
      .filter(f => {
        // First, ensure we have valid dates
        if (!f.departure_date || !f.return_date) {
          console.log(`[Unified Search] Filtering out flight: missing dates (departure: ${f.departure_date}, return: ${f.return_date})`)
          return false
        }
        
        // Then check trip duration using return_date (for round trips)
        if (holidayData.trip_duration_min || holidayData.trip_duration_max) {
          const minDuration = holidayData.trip_duration_min || 0
          const maxDuration = holidayData.trip_duration_max || 999
          
          const outboundDate = new Date(f.departure_date)
          const returnDate = new Date(f.return_date)
          const tripDurationDays = Math.ceil((returnDate.getTime() - outboundDate.getTime()) / (1000 * 60 * 60 * 24))
          
          const matches = tripDurationDays >= minDuration && tripDurationDays <= maxDuration
          
          if (!matches) {
            console.log(`[Unified Search] Filtering out flight: trip duration ${tripDurationDays} days (required: ${minDuration}-${maxDuration})`)
          }
          
          return matches
        }
        
        return true
      })

    if (flightsToSave.length > 0) {
      console.log(`[Unified Search] Attempting to save ${flightsToSave.length} flights to database`)
      console.log(`[Unified Search] Sample flight to save:`, JSON.stringify(flightsToSave[0], null, 2))
      console.log(`[Unified Search] Sample flight deal_url:`, flightsToSave[0]?.deal_url)
      console.log(`[Unified Search] Sample flight provider:`, flightsToSave[0]?.provider)
      
      const { data: savedFlights, error: saveError } = await supabase
        .from("flights")
        .insert(flightsToSave)
        .select()
      
      if (saveError) {
        console.error("[Unified Search] Error saving flights:", saveError)
        console.error("[Unified Search] Save error details:", JSON.stringify(saveError, null, 2))
        console.error("[Unified Search] Save error code:", saveError.code)
        console.error("[Unified Search] Save error message:", saveError.message)
        console.error("[Unified Search] Save error hint:", saveError.hint)
      } else {
        console.log(`[Unified Search] Successfully saved ${savedFlights?.length || flightsToSave.length} flights to database`)
        if (savedFlights && savedFlights.length > 0) {
          console.log(`[Unified Search] Sample saved flight:`, JSON.stringify(savedFlights[0], null, 2))
          console.log(`[Unified Search] Saved flight deal_url:`, savedFlights[0]?.deal_url)
          console.log(`[Unified Search] Saved flight provider:`, savedFlights[0]?.provider)
        }
      }
    } else {
      console.warn("[Unified Search] No flights to save after filtering")
      console.warn(`[Unified Search] Top offers count: ${topOffers.length}`)
      console.warn(`[Unified Search] Holiday trip duration requirements: ${holidayData.trip_duration_min || "none"} - ${holidayData.trip_duration_max || "none"} days`)
      if (topOffers.length > 0) {
        console.warn(`[Unified Search] Sample offer that was filtered out:`, {
          segments: topOffers[0].segments.length,
          firstDeparture: topOffers[0].segments[0]?.departure,
          lastArrival: topOffers[0].segments[topOffers[0].segments.length - 1]?.arrival,
          deal_url: topOffers[0].deal_url,
          provider: topOffers[0].provider,
        })
      }
    }

    // Update holiday with last search timestamp
    await supabase
      .from("holidays")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id)

    // Count how many flights were actually saved to database
    const { count: savedCount } = await supabase
      .from("flights")
      .select("*", { count: "exact", head: true })
      .eq("holiday_id", id)

    console.log(`[Unified Search] Total flights in database for this holiday: ${savedCount || 0}`)
    console.log("[Unified Search] ========================================")

    // ========================================================================
    // Return final result
    // ========================================================================
    // Single-line structured summary so tuning runs can be aggregated with `jq`
    // over server logs without parsing the prose console output.
    const filteredScores = (filteredCandidates || []).map((c) => c.score).sort((a, b) => a - b)
    const summary = {
      tag: "unified_search_summary",
      holiday_id: id,
      seed,
      anchors_used: anchors.length,
      candidates_generated: dateCandidates?.length || 0,
      candidates_selected: filteredCandidates?.length || 0,
      score_p25: filteredScores[Math.floor(filteredScores.length * 0.25)] ?? null,
      score_p50: filteredScores[Math.floor(filteredScores.length * 0.5)] ?? null,
      score_p75: filteredScores[Math.floor(filteredScores.length * 0.75)] ?? null,
      serpapi_calls: searchParamsArray.length,
      results_normalized: normalizedOffers.length,
      results_scored: scoredOffers.length,
      saved_flights: savedCount || flightsToSave.length || 0,
      cheapest_price: topOffers.length > 0 ? topOffers[0].price.total : null,
      price_insight_levels: priceInsights.map((p) => p.price_level).filter(Boolean),
      errors: errors.length,
      duration_ms: duration,
    }
    console.log("[Unified Search] SUMMARY", JSON.stringify(summary))

    return NextResponse.json({
      success: true,
      offers: topOffers,
      preferences,
      message: `Found ${topOffers.length} best-matching flight offers`,
      ai_thoughts: aiThoughts, // Include AI thinking process
      metadata: {
        total_retrieved: allRawResults.length,
        total_normalized: normalizedOffers.length,
        total_scored: scoredOffers.length,
        saved_to_db: savedCount || flightsToSave.length || 0,
        search_errors: errors.length > 0 ? errors : undefined,
        total_candidates_generated: dateCandidates?.length || 0,
        top_selected: filteredCandidates?.length || 0,
        price_insights: priceInsights.length > 0 ? priceInsights : undefined,
        seed,
        anchors_used: anchors.length,
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

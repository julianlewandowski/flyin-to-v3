/**
 * LLM Candidate Filter
 * 
 * Uses OpenAI to evaluate and score candidate date pairs, filtering down
 * from 15-25 candidates to the top 5-7 best options before SerpAPI calls.
 */

import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import type { DateCandidate } from "./flexible-date-explorer"
import type { ThoughtStreamCallback } from "./ai-thought-stream"
import { emitUserThought, ThoughtMessages } from "./ai-thought-stream"

const CandidateScoreSchema = z.object({
  depart_date: z.string().describe("Departure date in YYYY-MM-DD format"),
  return_date: z.string().describe("Return date in YYYY-MM-DD format"),
  score: z.number().min(0).max(100).describe("Score from 0-100 based on price potential and preference fit"),
  estimated_price_tier: z.enum(["very_low", "low", "medium", "high", "very_high"]).optional(),
  reasoning: z.string().describe("Brief explanation of why this date pair scored this way"),
})

const CandidateFilterResultSchema = z.object({
  top_candidates: z
    .array(CandidateScoreSchema)
    .max(10)
    .describe("Top 5-10 candidate date pairs ranked by score, highest first"),
  analysis_summary: z
    .string()
    .describe("Brief summary of price trends and patterns identified"),
})

type CandidateFilterResult = z.infer<typeof CandidateFilterResultSchema>

export interface CandidateFilterInput {
  candidates: DateCandidate[]
  origin_airports: string[]
  destination_airports: string[]
  start_date: string
  end_date: string
  trip_length_min: number
  trip_length_max: number
  budget?: number | null
  preferences?: {
    budget_sensitivity?: "low" | "medium" | "high"
    flexibility?: "strict" | "moderate" | "flexible"
    preferred_weekdays?: string[]
    avoid_weekdays?: string[]
  }
  thoughtCallback?: ThoughtStreamCallback
}

/**
 * Filter candidate date pairs using OpenAI to select the top 5-7.
 * 
 * This function evaluates candidates based on:
 * - Estimated price levels (from web search knowledge)
 * - Preference alignment (weekdays, budget, flexibility)
 * - Date range coverage (early, mid, late)
 * - Trip length diversity
 */
export async function filterDateCandidates(
  input: CandidateFilterInput
): Promise<Array<{
  depart_date: string
  return_date: string
  score: number
  reasoning: string
  estimated_price_tier?: string
}>> {
  const { candidates, thoughtCallback } = input

  if (candidates.length === 0) {
    return []
  }

  if (candidates.length <= 10) {
    // Already within limit, just return with default scores
    emitUserThought(thoughtCallback, `Found ${candidates.length} promising date combinations.`)
    return candidates.map(c => ({
      depart_date: c.depart_date,
      return_date: c.return_date,
      score: 70,
      reasoning: `Candidate with ${c.trip_length_days}-day trip in ${c.start_date_position} date range`,
    }))
  }

  emitUserThought(
    thoughtCallback,
    ThoughtMessages.filteringCandidates(candidates.length)
  )

  try {
    const prompt = buildFilterPrompt(input)

    emitUserThought(thoughtCallback, ThoughtMessages.comparingDates())

    const { object: result } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: CandidateFilterResultSchema,
      prompt,
      temperature: 0.3, // Slightly higher for more variation in scoring
    })

    emitUserThought(
      thoughtCallback,
      `Selected the top ${result.top_candidates.length} date options based on price potential and preferences.`
    )

    // Validate and ensure we have valid date pairs
    const validated = result.top_candidates
      .filter(c => {
        // Validate dates are in the candidate list
        return candidates.some(
          orig => orig.depart_date === c.depart_date && orig.return_date === c.return_date
        )
      })
      .slice(0, 10) // Ensure max 10

    // If we don't have enough, fill with remaining candidates
    if (validated.length < 5 && candidates.length >= 5) {
      const validatedSet = new Set(validated.map(c => `${c.depart_date}:${c.return_date}`))
      const remaining = candidates
        .filter(c => !validatedSet.has(`${c.depart_date}:${c.return_date}`))
        .slice(0, 5 - validated.length)
        .map(c => ({
          depart_date: c.depart_date,
          return_date: c.return_date,
          score: 60,
          reasoning: `Additional candidate with ${c.trip_length_days}-day trip`,
        }))

      validated.push(...remaining)
    }

    return validated.slice(0, 10)
  } catch (error) {
    console.error("[Candidate Filter] Error filtering candidates:", error)
    emitUserThought(
      thoughtCallback,
      "Using intelligent date selection based on your preferences..."
    )

    // Fallback: select candidates with diverse trip lengths and date positions
    return selectDiverseCandidates(candidates)
  }
}

/**
 * Build the prompt for OpenAI candidate filtering.
 */
function buildFilterPrompt(input: CandidateFilterInput): string {
  const {
    candidates,
    origin_airports,
    destination_airports,
    start_date,
    end_date,
    trip_length_min,
    trip_length_max,
    budget,
    preferences,
  } = input

  const originsText = origin_airports.join(", ")
  const destinationsText = destination_airports.join(", ")
  const dateRange = `${start_date} to ${end_date}`
  const tripLength = `${trip_length_min}-${trip_length_max} days`
  const budgetText = budget ? `Budget: €${budget.toLocaleString()}` : "No strict budget"

  const prefsText = preferences
    ? `
Preferences:
- Budget sensitivity: ${preferences.budget_sensitivity || "medium"}
- Flexibility: ${preferences.flexibility || "moderate"}
${preferences.preferred_weekdays?.length ? `- Preferred weekdays: ${preferences.preferred_weekdays.join(", ")}` : ""}
${preferences.avoid_weekdays?.length ? `- Avoid weekdays: ${preferences.avoid_weekdays.join(", ")}` : ""}`
    : ""

  const candidatesText = candidates
    .map((c, idx) => {
      const departDate = new Date(c.depart_date)
      const weekday = departDate.toLocaleDateString("en-US", { weekday: "long" })
      return `${idx + 1}. Depart: ${c.depart_date} (${weekday}), Return: ${c.return_date}, Trip length: ${c.trip_length_days} days, Position: ${c.start_date_position}`
    })
    .join("\n")

  return `You are an expert flight price analyst. Your task is to evaluate and rank ${candidates.length} candidate date pairs, selecting the TOP 5-7 that are most likely to have the BEST PRICES and BEST PREFERENCE FIT.

FLIGHT SEARCH CONTEXT:
- Origin airports: ${originsText}
- Destination airports: ${destinationsText}
- Date range: ${dateRange}
- Required trip length: ${tripLength}
${budgetText}${prefsText}

CANDIDATE DATE PAIRS TO EVALUATE:
${candidatesText}

YOUR TASK:
1. Evaluate each candidate based on:
   - Price potential (mid-week flights, off-peak seasons, avoiding holidays)
   - Preference alignment (weekday preferences, budget sensitivity)
   - Date range coverage (ensure we cover early, mid, and late segments)
   - Trip length diversity (ensure variety in trip lengths)

2. Score each candidate from 0-100 where:
   - 90-100: Excellent price potential + perfect preference match
   - 80-89: Very good price potential + good preference match
   - 70-79: Good price potential + acceptable preference match
   - 60-69: Moderate price potential + partial preference match
   - Below 60: Lower priority options

3. Select the TOP 5-7 candidates (highest scores) that:
   - Maximize price potential
   - Best match user preferences
   - Provide good coverage across the date range
   - Include variety in trip lengths

PRICING KNOWLEDGE TO APPLY:
- Mid-week flights (Tue-Thu) are typically 15-30% cheaper than weekends
- Shoulder seasons have better deals than peak seasons
- Avoid major holidays, school breaks, and peak travel periods
- Early morning and red-eye flights are often cheaper
- Airlines often release deals on Tuesdays

CRITICAL REQUIREMENTS:
- Return EXACTLY 5-7 candidates (prioritize quality over quantity)
- Rank by score (highest first)
- Ensure dates are valid and trip lengths are within ${trip_length_min}-${trip_length_max} days
- Provide brief reasoning for each selection

Return the top candidates with scores and reasoning.`
}

/**
 * Fallback: Select diverse candidates when OpenAI filtering fails.
 */
function selectDiverseCandidates(
  candidates: DateCandidate[]
): Array<{
  depart_date: string
  return_date: string
  score: number
  reasoning: string
}> {
  // Group by position and trip length
  const byPosition = {
    early: candidates.filter(c => c.start_date_position === "early"),
    mid: candidates.filter(c => c.start_date_position === "mid"),
    late: candidates.filter(c => c.start_date_position === "late"),
  }

  const byTripLength = new Map<number, DateCandidate[]>()
  candidates.forEach(c => {
    const existing = byTripLength.get(c.trip_length_days) || []
    existing.push(c)
    byTripLength.set(c.trip_length_days, existing)
  })

  const selected: DateCandidate[] = []
  const seen = new Set<string>()

  // Select from each position
  for (const [position, candidates] of Object.entries(byPosition)) {
    if (candidates.length > 0) {
      const candidate = candidates[Math.floor(Math.random() * candidates.length)]
      const key = `${candidate.depart_date}:${candidate.return_date}`
      if (!seen.has(key)) {
        selected.push(candidate)
        seen.add(key)
      }
    }
  }

  // Select diverse trip lengths
  const tripLengths = Array.from(byTripLength.keys()).sort((a, b) => a - b)
  for (const length of tripLengths) {
    if (selected.length >= 7) break
    const candidates = byTripLength.get(length) || []
    if (candidates.length > 0) {
      const candidate = candidates[Math.floor(Math.random() * candidates.length)]
      const key = `${candidate.depart_date}:${candidate.return_date}`
      if (!seen.has(key)) {
        selected.push(candidate)
        seen.add(key)
      }
    }
  }

  // Fill remaining slots with any candidates
  for (const candidate of candidates) {
    if (selected.length >= 7) break
    const key = `${candidate.depart_date}:${candidate.return_date}`
    if (!seen.has(key)) {
      selected.push(candidate)
      seen.add(key)
    }
  }

  return selected.slice(0, 10).map(c => ({
    depart_date: c.depart_date,
    return_date: c.return_date,
    score: 65,
    reasoning: `Diverse selection: ${c.trip_length_days}-day trip in ${c.start_date_position} date range`,
  }))
}


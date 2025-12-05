/**
 * Global Candidate Scorer
 * 
 * Scores all date candidates from ALL destinations using OpenAI's reasoning.
 * Focuses on pattern-based scoring (day-of-week, seasonality, preferences)
 * rather than price estimation.
 * 
 * Then selects the TOP 5 globally across all destinations.
 */

import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import type { AnchoredDateCandidate } from "./anchor-date-generator"
import type { ThoughtStreamCallback } from "./ai-thought-stream"
import { emitUserThought } from "./ai-thought-stream"

const CandidateScoreSchema = z.object({
  origin: z.string(),
  destination: z.string(),
  depart_date: z.string().describe("Departure date in YYYY-MM-DD format"),
  return_date: z.string().describe("Return date in YYYY-MM-DD format"),
  score: z.number().min(0).max(1).describe("Score from 0-1 based on pattern-based analysis (NOT price estimation)"),
  reasoning: z.string().describe("Brief explanation of scoring factors (day-of-week, seasonality, preferences)"),
})

const GlobalScoringResultSchema = z.object({
  scored_candidates: z
    .array(CandidateScoreSchema)
    .describe("All candidates with scores, ranked highest first"),
  analysis_summary: z
    .string()
    .optional()
    .describe("Brief summary of patterns identified across all destinations"),
})

type GlobalScoringResult = z.infer<typeof GlobalScoringResultSchema>

export interface GlobalCandidateScoringInput {
  candidates: AnchoredDateCandidate[]
  origin_airports: string[]
  destination_airports: string[]
  earliest_departure: string
  latest_return: string
  min_length_days: number
  max_length_days: number
  budget?: number | null
  preferences?: {
    budget_sensitivity?: "low" | "medium" | "high"
    flexibility?: "strict" | "moderate" | "flexible"
    preferred_weekdays?: string[]
    avoid_weekdays?: string[]
    preferred_airlines?: string[]
  }
  thoughtCallback?: ThoughtStreamCallback
}

export interface ScoredCandidate {
  origin: string
  destination: string
  depart_date: string
  return_date: string
  score: number
  reasoning: string
}

/**
 * Score all candidates globally and return TOP 5 across all destinations.
 * 
 * Scoring is based on:
 * - Day-of-week cheapness patterns (Tue/Wed/Sat typically cheaper)
 * - Seasonality (shoulder season vs peak)
 * - User preferences (weekdays, flexibility, budget sensitivity)
 * - General flight search heuristics
 * 
 * IMPORTANT: Does NOT estimate actual prices, only patterns.
 */
export async function scoreCandidatesGlobally(
  input: GlobalCandidateScoringInput
): Promise<ScoredCandidate[]> {
  const { candidates, thoughtCallback } = input

  if (candidates.length === 0) {
    return []
  }

  emitUserThought(
    thoughtCallback,
    `Evaluating ${candidates.length} date combinations across all destinations...`
  )

  try {
    const prompt = buildScoringPrompt(input)

    emitUserThought(
      thoughtCallback,
      "Analyzing day-of-week patterns and seasonal trends..."
    )

    const { object: result } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: GlobalScoringResultSchema,
      prompt,
      temperature: 0.2, // Low temperature for consistent scoring
    })

    emitUserThought(
      thoughtCallback,
      `Scored all candidates. Selecting the top 5 best options globally...`
    )

    // Sort by score (highest first) and take top 5
    const sorted = result.scored_candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    // Validate that scored candidates match input candidates
    const validScored: ScoredCandidate[] = []
    const candidateSet = new Set(
      candidates.map(c => `${c.origin}:${c.destination}:${c.depart_date}:${c.return_date}`)
    )

    for (const scored of sorted) {
      const key = `${scored.origin}:${scored.destination}:${scored.depart_date}:${scored.return_date}`
      if (candidateSet.has(key)) {
        validScored.push({
          origin: scored.origin,
          destination: scored.destination,
          depart_date: scored.depart_date,
          return_date: scored.return_date,
          score: scored.score,
          reasoning: scored.reasoning,
        })
      }
    }

    // If we don't have 5, fill with remaining candidates
    if (validScored.length < 5) {
      const scoredSet = new Set(
        validScored.map(c => `${c.origin}:${c.destination}:${c.depart_date}:${c.return_date}`)
      )
      
      for (const candidate of candidates) {
        if (validScored.length >= 5) break
        
        const key = `${candidate.origin}:${candidate.destination}:${candidate.depart_date}:${candidate.return_date}`
        if (!scoredSet.has(key)) {
          validScored.push({
            origin: candidate.origin,
            destination: candidate.destination,
            depart_date: candidate.depart_date,
            return_date: candidate.return_date,
            score: 0.5, // Default score
            reasoning: `Additional candidate for ${candidate.destination}`,
          })
          scoredSet.add(key)
        }
      }
    }

    return validScored.slice(0, 5)
  } catch (error) {
    console.error("[Global Scorer] Error scoring candidates:", error)
    emitUserThought(
      thoughtCallback,
      "Using intelligent selection based on date patterns..."
    )

    // Fallback: Select diverse candidates manually
    return selectTop5DiverseCandidates(candidates)
  }
}

/**
 * Build the scoring prompt for OpenAI.
 * 
 * IMPORTANT: Prompt emphasizes pattern-based scoring, NOT price estimation.
 */
function buildScoringPrompt(input: GlobalCandidateScoringInput): string {
  const {
    candidates,
    origin_airports,
    destination_airports,
    earliest_departure,
    latest_return,
    min_length_days,
    max_length_days,
    budget,
    preferences,
  } = input

  const originsText = origin_airports.join(", ")
  const destinationsText = destination_airports.join(", ")
  const dateRange = `${earliest_departure} to ${latest_return}`
  const tripLength = `${min_length_days}-${max_length_days} days`
  const budgetText = budget ? `Budget constraint: €${budget.toLocaleString()}` : "No strict budget limit"

  const prefsText = preferences
    ? `
Preferences:
- Budget sensitivity: ${preferences.budget_sensitivity || "medium"}
- Flexibility: ${preferences.flexibility || "moderate"}
${preferences.preferred_weekdays?.length ? `- Preferred weekdays: ${preferences.preferred_weekdays.join(", ")}` : ""}
${preferences.avoid_weekdays?.length ? `- Avoid weekdays: ${preferences.avoid_weekdays.join(", ")}` : ""}
${preferences.preferred_airlines?.length ? `- Preferred airlines: ${preferences.preferred_airlines.join(", ")}` : ""}`
    : ""

  // Format candidates for prompt
  const candidatesText = candidates
    .map((c, idx) => {
      const departDate = new Date(c.depart_date)
      const weekday = departDate.toLocaleDateString("en-US", { weekday: "long" })
      return `${idx + 1}. Origin: ${c.origin} → Destination: ${c.destination}, Depart: ${c.depart_date} (${weekday}), Return: ${c.return_date}, Trip length: ${c.trip_length_days} days, Anchor: ${c.anchor_type}`
    })
    .join("\n")

  return `You are an expert flight search analyst. Your task is to score ${candidates.length} candidate date pairs from MULTIPLE DESTINATIONS based on pattern-based analysis. These scores will determine which 5 candidates get searched with expensive API calls.

FLIGHT SEARCH CONTEXT:
- Origin airports: ${originsText}
- Destination airports: ${destinationsText}
- Date range: ${dateRange}
- Required trip length: ${tripLength}
${budgetText}${prefsText}

CANDIDATE DATE PAIRS TO SCORE (from all destinations):
${candidatesText}

YOUR TASK:
Score each candidate from 0.0 to 1.0 based on pattern-based analysis. DO NOT estimate actual prices. Instead, evaluate:

1. **Day-of-Week Patterns (30%)**
   - Tuesday, Wednesday, Saturday are typically 15-30% cheaper than weekends
   - Friday and Sunday departures are often most expensive
   - Monday/Thursday are moderate

2. **Seasonality & Timing (25%)**
   - Shoulder seasons (between peak and off-peak) are better
   - Avoid major holidays, school breaks, peak travel periods
   - Early morning or red-eye flights are typically cheaper
   - Consider regional seasonal patterns

3. **Date Range Coverage (15%)**
   - Early anchor = earliest departure option
   - Mid anchor = middle of range
   - Late anchor = latest departure option
   - Value diverse coverage across the range

4. **User Preference Alignment (20%)**
   - Preferred weekdays match
   - Avoid weekdays match
   - Budget sensitivity (if high, prioritize cheaper patterns)
   - Flexibility level

5. **Trip Length Fit (10%)**
   - Does trip length match user preferences?
   - Shorter trips may be cheaper (if budget-sensitive)

CRITICAL REQUIREMENTS:
- Score from 0.0 (worst) to 1.0 (best) based on patterns, NOT price estimates
- DO NOT try to guess actual flight prices
- Focus on known patterns: day-of-week, seasonality, timing
- Higher scores = better pattern match for cheaper flights + preference alignment
- Return scores for ALL candidates, ranked highest to lowest

OUTPUT FORMAT:
Return all candidates with scores, sorted highest to lowest. The top 5 will be selected for API search.

EXAMPLE SCORING REASONING:
- "Tuesday departure (cheaper day-of-week pattern) in shoulder season, matches preferred weekday"
- "Friday departure (expensive pattern) during peak season, avoid"
- "Wednesday departure with good date range coverage, moderate preference match"`

}

/**
 * Fallback: Select top 5 diverse candidates when OpenAI fails.
 */
function selectTop5DiverseCandidates(
  candidates: AnchoredDateCandidate[]
): ScoredCandidate[] {
  // Group by destination to ensure diversity
  const byDestination = new Map<string, AnchoredDateCandidate[]>()
  candidates.forEach(c => {
    const existing = byDestination.get(c.destination) || []
    existing.push(c)
    byDestination.set(c.destination, existing)
  })

  const selected: ScoredCandidate[] = []
  const seen = new Set<string>()

  // Select at least one from each destination first
  for (const [destination, destCandidates] of byDestination.entries()) {
    if (selected.length >= 5) break
    
    // Prefer cheap weekday anchors
    const cheapWeekday = destCandidates.find(c => c.anchor_type === "random_cheap_weekday")
    if (cheapWeekday) {
      const key = `${cheapWeekday.origin}:${cheapWeekday.destination}:${cheapWeekday.depart_date}:${cheapWeekday.return_date}`
      if (!seen.has(key)) {
        selected.push({
          origin: cheapWeekday.origin,
          destination: cheapWeekday.destination,
          depart_date: cheapWeekday.depart_date,
          return_date: cheapWeekday.return_date,
          score: 0.7,
          reasoning: `Cheap weekday pattern for ${destination}`,
        })
        seen.add(key)
      }
    }
  }

  // Fill remaining slots with best candidates
  // Prioritize: mid anchor > early anchor > late anchor > random
  const anchorPriority = { mid: 4, early: 3, late: 2, random_cheap_weekday: 5, random: 1 }

  const sortedCandidates = [...candidates].sort((a, b) => {
    const priorityA = anchorPriority[a.anchor_type] || 0
    const priorityB = anchorPriority[b.anchor_type] || 0
    return priorityB - priorityA
  })

  for (const candidate of sortedCandidates) {
    if (selected.length >= 5) break
    
    const key = `${candidate.origin}:${candidate.destination}:${candidate.depart_date}:${candidate.return_date}`
    if (!seen.has(key)) {
      selected.push({
        origin: candidate.origin,
        destination: candidate.destination,
        depart_date: candidate.depart_date,
        return_date: candidate.return_date,
        score: 0.6,
        reasoning: `Diverse selection for ${candidate.destination}`,
      })
      seen.add(key)
    }
  }

  return selected.slice(0, 5)
}


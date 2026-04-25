/**
 * Candidate filter.
 *
 * Selects the top N (depart, return) date pairs from the flexible-date
 * explorer's output. Previously this delegated the entire ranking to gpt-4o-mini
 * with a prompt that asked the model to "predict price potential" — the model
 * had no real pricing data and simply restated weekday/holiday heuristics. We
 * now apply those heuristics directly via `date-candidate-scorer` so the
 * pipeline is fast, free, deterministic, and unit-testable.
 *
 * The exported signature is preserved so callers (the unified search route and
 * the price tracker) need no changes.
 */

import type { DateCandidate } from "./flexible-date-explorer"
import type { ThoughtStreamCallback } from "./ai-thought-stream"
import { emitUserThought, ThoughtMessages } from "./ai-thought-stream"
import { scoreDateCandidates, type ScoringPreferences } from "./date-candidate-scorer"

export interface CandidateFilterInput {
  candidates: DateCandidate[]
  origin_airports: string[]
  destination_airports: string[]
  start_date: string
  end_date: string
  trip_length_min: number
  trip_length_max: number
  budget?: number | null
  preferences?: ScoringPreferences & {
    flexibility?: "strict" | "moderate" | "flexible"
  }
  /**
   * Optional ISO 3166-1 alpha-2 country code, used to pick which school-holiday
   * peak windows to penalise. Inferred from the first origin airport when omitted.
   */
  origin_country?: string
  thoughtCallback?: ThoughtStreamCallback
  /** How many candidates to return. Defaults to 10. */
  max_results?: number
}

export interface FilteredCandidate {
  depart_date: string
  return_date: string
  score: number
  reasoning: string
}

const DEFAULT_MAX_RESULTS = 10

export async function filterDateCandidates(input: CandidateFilterInput): Promise<FilteredCandidate[]> {
  const { candidates, thoughtCallback } = input
  if (candidates.length === 0) return []

  const max = input.max_results ?? DEFAULT_MAX_RESULTS

  emitUserThought(thoughtCallback, ThoughtMessages.filteringCandidates(candidates.length))

  const scored = scoreDateCandidates({
    candidates,
    preferences: input.preferences,
    origin_country: input.origin_country ?? inferCountry(input.origin_airports),
    budget: input.budget,
  })

  if (scored.length === 0) {
    // Hard filters wiped everything out (e.g. preferred_weekdays excludes all
    // sampled depart weekdays). Fall back to the original list so we don't
    // return zero results to SerpAPI.
    emitUserThought(
      thoughtCallback,
      "No candidates matched your weekday preferences strictly — broadening the search."
    )
    return candidates.slice(0, max).map((c) => ({
      depart_date: c.depart_date,
      return_date: c.return_date,
      score: 50,
      reasoning: `${c.trip_length_days}-day trip in ${c.start_date_position} window`,
    }))
  }

  emitUserThought(thoughtCallback, ThoughtMessages.comparingDates())

  const top = scored.slice(0, max)
  const summary = describeTop(top)
  if (summary) emitUserThought(thoughtCallback, summary)

  return top.map((s) => ({
    depart_date: s.depart_date,
    return_date: s.return_date,
    score: s.score,
    reasoning: s.reasoning,
  }))
}

/**
 * Best-effort airport→country mapping for choosing peak-window data. Falls back
 * to GB if no match. (Full mapping lives in lib/airports for the autocomplete
 * UI; we only need a country letter here, so a small lookup is fine.)
 */
function inferCountry(originAirports: string[]): string {
  if (!originAirports || originAirports.length === 0) return "GB"
  const code = originAirports[0]?.toUpperCase().trim()
  if (!code) return "GB"
  // Prefix-based heuristic for the UK/EU/US clusters we care about.
  if (/^(LHR|LGW|STN|LTN|LCY|MAN|EDI|GLA|BRS|BHX|LPL|NCL|EXT|BFS)$/.test(code)) return "GB"
  if (/^(FRA|MUC|BER|HAM|DUS|CGN|STR|TXL|HAJ)$/.test(code)) return "DE"
  if (/^(JFK|LGA|EWR|LAX|SFO|ORD|MIA|DFW|SEA|BOS|ATL|DEN|IAD|IAH|PHX)$/.test(code)) return "US"
  return "GB"
}

function describeTop(top: Array<{ score: number; reasoning: string }>): string | null {
  if (top.length === 0) return null
  const avg = Math.round(top.reduce((s, c) => s + c.score, 0) / top.length)
  return `Selected ${top.length} top date options (average match score ${avg}/100).`
}

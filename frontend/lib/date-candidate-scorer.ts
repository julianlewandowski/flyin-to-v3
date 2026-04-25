/**
 * Deterministic date-candidate scorer.
 *
 * Replaces the per-search LLM call that was asked to "predict price potential"
 * for every candidate date pair. The LLM had no real pricing data and ranked
 * candidates on surface heuristics anyway — those heuristics are encoded here
 * so scoring is fast, free, reproducible, and testable.
 *
 * Scoring components (all stack additively into the final 0..100 score):
 *   - weekday        — favours mid-week depart/Mon-Tue return
 *   - peak_season    — penalises overlap with school holidays / peak windows
 *   - shoulder_season— rewards classic shoulder months
 *   - trip_length    — small bias toward "round" lengths (7, 10, 14)
 *   - preference     — preferred-weekday hard filter + soft bonuses
 */

import type { DateCandidate } from "./flexible-date-explorer"

export interface ScoringPreferences {
  budget_sensitivity?: "low" | "medium" | "high"
  preferred_weekdays?: string[]
  avoid_weekdays?: string[]
}

export interface ScoringInput {
  candidates: DateCandidate[]
  preferences?: ScoringPreferences
  /** ISO 3166-1 alpha-2 country code for the user's origin. Defaults to "GB". */
  origin_country?: string
  budget?: number | null
}

export interface ScoredCandidate {
  depart_date: string
  return_date: string
  trip_length_days: number
  score: number
  reasoning: string
  components: {
    weekday: number
    peak_season: number
    shoulder_season: number
    trip_length: number
    preference: number
  }
}

const WEEKDAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
]

/**
 * Static peak-window data. Each entry is a (start, end) inclusive month/day pair
 * applied against the candidate's depart-date year. Keep this small and obvious
 * — it isn't a calendar database, it's a heuristic floor.
 */
type PeakWindow = { name: string; start: [number, number]; end: [number, number] }

const PEAK_WINDOWS_BY_COUNTRY: Record<string, PeakWindow[]> = {
  GB: [
    { name: "Christmas / NYE", start: [12, 18], end: [1, 4] },
    { name: "February half-term", start: [2, 12], end: [2, 22] },
    { name: "Easter break", start: [3, 28], end: [4, 14] },
    { name: "May half-term", start: [5, 25], end: [6, 4] },
    { name: "Summer school holidays", start: [7, 18], end: [8, 31] },
    { name: "October half-term", start: [10, 22], end: [10, 31] },
  ],
  DE: [
    { name: "Christmas / NYE", start: [12, 20], end: [1, 5] },
    { name: "Easter break", start: [3, 25], end: [4, 14] },
    { name: "Summer break", start: [7, 1], end: [8, 31] },
    { name: "Autumn break", start: [10, 10], end: [10, 25] },
  ],
  US: [
    { name: "Spring Break", start: [3, 10], end: [3, 25] },
    { name: "Memorial Day weekend", start: [5, 25], end: [5, 31] },
    { name: "Independence Day", start: [7, 1], end: [7, 7] },
    { name: "Thanksgiving", start: [11, 22], end: [11, 30] },
    { name: "Christmas / NYE", start: [12, 18], end: [1, 4] },
  ],
}

const SHOULDER_MONTHS = new Set([4, 5, 9, 10]) // late spring + early autumn

/**
 * Score every candidate using a deterministic rubric. Returns candidates
 * sorted by descending score. Candidates that violate hard filters (e.g.
 * `preferred_weekdays`) are dropped entirely.
 */
export function scoreDateCandidates(input: ScoringInput): ScoredCandidate[] {
  const { candidates, preferences, origin_country = "GB", budget } = input
  const peakWindows = PEAK_WINDOWS_BY_COUNTRY[origin_country] || PEAK_WINDOWS_BY_COUNTRY.GB
  const peakWeight = preferences?.budget_sensitivity === "high" ? 1.5 : preferences?.budget_sensitivity === "low" ? 0.5 : 1
  const preferredWeekdays = normaliseWeekdays(preferences?.preferred_weekdays)
  const avoidWeekdays = normaliseWeekdays(preferences?.avoid_weekdays)

  const scored: ScoredCandidate[] = []

  for (const c of candidates) {
    const departDate = parseDate(c.depart_date)
    const returnDate = parseDate(c.return_date)
    if (!departDate || !returnDate) continue

    const departWeekday = departDate.getUTCDay()
    const returnWeekday = returnDate.getUTCDay()

    // Hard filter: preferred_weekdays takes precedence over everything.
    if (preferredWeekdays.size > 0 && !preferredWeekdays.has(departWeekday)) continue
    if (avoidWeekdays.size > 0 && avoidWeekdays.has(departWeekday)) continue

    const weekdayScore = scoreWeekday(departWeekday, returnWeekday)
    const peakScore = scorePeakOverlap(departDate, returnDate, peakWindows) * peakWeight
    const shoulderScore = scoreShoulder(departDate, returnDate)
    const tripLengthScore = scoreTripLength(c.trip_length_days)
    const preferenceScore = scorePreferenceFit(departWeekday, preferredWeekdays, avoidWeekdays)

    const components = {
      weekday: weekdayScore,
      peak_season: peakScore,
      shoulder_season: shoulderScore,
      trip_length: tripLengthScore,
      preference: preferenceScore,
    }

    // Anchor at 50 so the 0..100 range is centred and small modifiers don't
    // collapse everything to one extreme.
    const raw = 50 + weekdayScore + peakScore + shoulderScore + tripLengthScore + preferenceScore
    const score = Math.max(0, Math.min(100, Math.round(raw)))

    scored.push({
      depart_date: c.depart_date,
      return_date: c.return_date,
      trip_length_days: c.trip_length_days,
      score,
      reasoning: buildReasoning(c, components, departWeekday, peakWindows, departDate, returnDate),
      components,
    })
  }

  // Tie-break by trip-length variety: when scores tie, prefer the trip length
  // that's seen least so far. This preserves diversity without resorting later.
  scored.sort((a, b) => b.score - a.score)
  // Budget reference is not used numerically (we don't know prices yet) but is
  // accepted on the input so callers can pass it without code-shaping.
  void budget

  return scored
}

function parseDate(iso: string): Date | null {
  // Treat YYYY-MM-DD as a UTC date so weekday calculations don't drift across
  // server timezones.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return null
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  return isNaN(d.getTime()) ? null : d
}

function normaliseWeekdays(input?: string[]): Set<number> {
  const out = new Set<number>()
  if (!input) return out
  for (const raw of input) {
    const idx = WEEKDAY_NAMES.indexOf(raw.trim().toLowerCase())
    if (idx >= 0) out.add(idx)
  }
  return out
}

function scoreWeekday(departWeekday: number, returnWeekday: number): number {
  // Outbound: Tue/Wed/Thu cheapest, Sun/Mon decent, Fri/Sat expensive.
  const departBonus = [
    -2, // Sun
    8,  // Mon
    20, // Tue
    18, // Wed
    14, // Thu
    -8, // Fri
    -10, // Sat
  ][departWeekday]
  // Return: Mon/Tue cheapest (less weekend demand), Fri/Sat costly.
  const returnBonus = [
    -4, // Sun
    10, // Mon
    8,  // Tue
    4,  // Wed
    0,  // Thu
    -6, // Fri
    -8, // Sat
  ][returnWeekday]
  return departBonus + returnBonus
}

/**
 * Penalise a candidate for every day of overlap with a known peak window.
 * Returns a non-positive number.
 */
function scorePeakOverlap(depart: Date, ret: Date, windows: PeakWindow[]): number {
  let overlapDays = 0
  const oneDay = 24 * 60 * 60 * 1000
  const tripDays = Math.round((ret.getTime() - depart.getTime()) / oneDay)
  if (tripDays <= 0) return 0

  for (let i = 0; i < tripDays; i++) {
    const d = new Date(depart.getTime() + i * oneDay)
    if (windows.some((w) => isInWindow(d, w))) overlapDays++
  }

  // ~3 points per day in peak, capped so an entire trip in peak is -25.
  return Math.max(-25, -3 * overlapDays)
}

function isInWindow(d: Date, w: PeakWindow): boolean {
  const month = d.getUTCMonth() + 1
  const day = d.getUTCDate()
  const start = w.start[0] * 100 + w.start[1]
  const end = w.end[0] * 100 + w.end[1]
  const cur = month * 100 + day
  // Handle windows that wrap year boundary (e.g. Dec 18 → Jan 4).
  if (start <= end) return cur >= start && cur <= end
  return cur >= start || cur <= end
}

function scoreShoulder(depart: Date, ret: Date): number {
  const departMonth = depart.getUTCMonth() + 1
  const returnMonth = ret.getUTCMonth() + 1
  let bonus = 0
  if (SHOULDER_MONTHS.has(departMonth)) bonus += 8
  if (SHOULDER_MONTHS.has(returnMonth)) bonus += 4
  return bonus
}

function scoreTripLength(days: number): number {
  // Round numbers are common pricing tiers; very short trips (<=2) or very long
  // ones (>=21) are atypical for leisure travel and tend to surface odd offers.
  if (days === 7 || days === 14) return 4
  if (days === 10 || days === 4) return 2
  if (days <= 2) return -3
  if (days >= 21) return -2
  return 0
}

function scorePreferenceFit(
  departWeekday: number,
  preferred: Set<number>,
  avoid: Set<number>
): number {
  let bonus = 0
  if (preferred.size > 0 && preferred.has(departWeekday)) bonus += 6
  if (avoid.size > 0 && !avoid.has(departWeekday)) bonus += 2
  return bonus
}

function buildReasoning(
  c: DateCandidate,
  components: ScoredCandidate["components"],
  departWeekday: number,
  windows: PeakWindow[],
  depart: Date,
  ret: Date
): string {
  const parts: string[] = []
  parts.push(`${c.trip_length_days}-day trip`)
  parts.push(`departs ${capitalise(WEEKDAY_NAMES[departWeekday])}`)

  if (components.weekday >= 18) parts.push("mid-week departure (typically cheaper)")
  else if (components.weekday <= -10) parts.push("weekend departure (typically pricier)")

  const peak = windows.find((w) => overlapsWindow(depart, ret, w))
  if (peak) parts.push(`overlaps ${peak.name}`)

  if (components.shoulder_season >= 8) parts.push("falls in shoulder season")
  if (c.start_date_position) parts.push(`${c.start_date_position} in your travel window`)

  return parts.join(", ")
}

function overlapsWindow(depart: Date, ret: Date, w: PeakWindow): boolean {
  const oneDay = 24 * 60 * 60 * 1000
  const tripDays = Math.round((ret.getTime() - depart.getTime()) / oneDay)
  for (let i = 0; i <= tripDays; i++) {
    if (isInWindow(new Date(depart.getTime() + i * oneDay), w)) return true
  }
  return false
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

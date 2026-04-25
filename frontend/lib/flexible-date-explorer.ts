/**
 * Flexible Date Explorer
 *
 * Generates flexible, randomized date candidates across the entire date range
 * and trip-length window. Replaces rigid weekly block logic with intelligent
 * exploration that covers early, mid, and late segments of the date range.
 *
 * Phase 4 additions:
 *   - Optional `seed` for reproducible sampling (so two searches in the same
 *     week return the same candidates — important for price tracking deltas).
 *   - Optional `anchors` (dates known to have surfaced cheap flights before)
 *     to bias a portion of candidates toward the historical best.
 */

export interface DateCandidate {
  depart_date: string // YYYY-MM-DD
  return_date: string // YYYY-MM-DD
  trip_length_days: number
  start_date_position: "early" | "mid" | "late"
}

export interface DateAnchor {
  /** YYYY-MM-DD depart date that previously surfaced a cheap flight. */
  depart_date: string
  /** Higher = stronger pull, e.g. inverse of price rank. */
  weight: number
}

export interface DateExplorationParams {
  start_date: string // YYYY-MM-DD
  end_date: string // YYYY-MM-DD
  trip_length_min: number
  trip_length_max: number
  target_candidates: number // Target number of candidates (15-25)
  /** Deterministic seed for reproducible sampling. Defaults to Math.random. */
  seed?: number
  /** Known-good depart dates to cluster a portion of candidates around. */
  anchors?: DateAnchor[]
  /** 0..1 — share of candidates that should cluster around `anchors`. Default 0.4. */
  exploit_share?: number
}

/**
 * Mulberry32 PRNG. Tiny, deterministic, fine for non-cryptographic sampling.
 * Returns a function that yields floats in [0, 1) like Math.random().
 */
export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0
  return function rng() {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Stable string→u32 hash for building seeds out of strings like
 * `${holiday.id}:${ISO_week}`.
 */
export function hashStringToSeed(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}

/**
 * Generate flexible date candidates using randomized sampling across
 * the entire date range and trip-length window.
 */
export function generateFlexibleDateCandidates(
  params: DateExplorationParams
): DateCandidate[] {
  const { start_date, end_date, trip_length_min, trip_length_max, target_candidates } = params

  const startDate = new Date(start_date)
  const endDate = new Date(end_date)
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  if (totalDays < trip_length_min) {
    return generateMinimalCandidates(start_date, end_date, trip_length_min, trip_length_max)
  }

  const rng: () => number = params.seed !== undefined ? createSeededRng(params.seed) : Math.random
  const anchors = (params.anchors || []).filter(
    (a) => a.depart_date >= start_date && a.depart_date <= end_date
  )
  const exploitShare = anchors.length > 0 ? Math.min(0.7, Math.max(0, params.exploit_share ?? 0.4)) : 0
  const exploreCount = Math.max(0, target_candidates - Math.floor(target_candidates * exploitShare))
  const exploitCount = target_candidates - exploreCount

  const candidates: DateCandidate[] = []
  const seen = new Set<string>()

  // Exploit: cluster around known-good anchors (Phase 4 memory).
  if (exploitCount > 0 && anchors.length > 0) {
    addAnchorClusteredCandidates(
      anchors,
      exploitCount,
      startDate,
      endDate,
      totalDays,
      trip_length_min,
      trip_length_max,
      candidates,
      seen,
      params,
      rng
    )
  }

  const remaining = target_candidates - candidates.length
  // Exploration mix: 30% even / 40% random / 30% clustered, recomputed against
  // the *remaining* budget after exploit candidates are placed.
  const evenlySpacedCount = Math.floor(remaining * 0.3)
  for (let i = 0; i < evenlySpacedCount; i++) {
    const progress = evenlySpacedCount > 1 ? i / (evenlySpacedCount - 1) : 0
    const daysFromStart = Math.floor(totalDays * progress)
    addCandidateForStartDay(
      startDate,
      endDate,
      daysFromStart,
      trip_length_min,
      trip_length_max,
      candidates,
      seen,
      params,
      undefined,
      rng
    )
  }

  const randomCount = Math.floor(remaining * 0.4)
  // Clamp to a non-negative window so very narrow ranges don't produce negative offsets.
  const randomWindow = Math.max(1, totalDays - trip_length_min)
  for (let i = 0; i < randomCount; i++) {
    const randomDaysFromStart = Math.floor(rng() * randomWindow)
    addCandidateForStartDay(
      startDate,
      endDate,
      randomDaysFromStart,
      trip_length_min,
      trip_length_max,
      candidates,
      seen,
      params,
      undefined,
      rng
    )
  }

  const clusterCount = Math.floor(remaining * 0.3)
  const segments = [
    { position: "early" as const, range: [0, totalDays * 0.33] },
    { position: "mid" as const, range: [totalDays * 0.33, totalDays * 0.66] },
    { position: "late" as const, range: [totalDays * 0.66, totalDays] },
  ]

  for (const segment of segments) {
    const segmentCount = Math.floor(clusterCount / segments.length)
    for (let i = 0; i < segmentCount; i++) {
      const baseDay = segment.range[0] + (segment.range[1] - segment.range[0]) * (i / (segmentCount || 1))
      const jitteredDay =
        baseDay + (rng() - 0.5) * (segment.range[1] - segment.range[0]) * 0.3
      const daysFromStart = Math.max(0, Math.floor(jitteredDay))

      const candidate = addCandidateForStartDay(
        startDate,
        endDate,
        daysFromStart,
        trip_length_min,
        trip_length_max,
        candidates,
        seen,
        params,
        segment.position,
        rng
      )

      if (candidate && i === 0 && trip_length_max > trip_length_min) {
        const maxTripCandidate = createCandidateWithTripLength(
          startDate,
          endDate,
          daysFromStart,
          trip_length_max,
          seen,
          segment.position
        )
        if (maxTripCandidate) {
          candidates.push(maxTripCandidate)
          seen.add(`${maxTripCandidate.depart_date}:${maxTripCandidate.return_date}`)
        }
      }
    }
  }

  ensureTripLengthCoverage(candidates, startDate, endDate, trip_length_min, trip_length_max, seen, params)

  shuffleArray(candidates, rng)

  return candidates.slice(0, target_candidates)
}

/**
 * Place candidates around each anchor with small jitter (±3 days) so we both
 * verify the historical-best stays cheap and probe nearby dates that might be
 * cheaper still. Anchors with higher weight get more candidates.
 */
function addAnchorClusteredCandidates(
  anchors: DateAnchor[],
  count: number,
  startDate: Date,
  endDate: Date,
  totalDays: number,
  tripLengthMin: number,
  tripLengthMax: number,
  candidates: DateCandidate[],
  seen: Set<string>,
  params: DateExplorationParams,
  rng: () => number
) {
  const totalWeight = anchors.reduce((s, a) => s + Math.max(0, a.weight), 0) || anchors.length
  for (const anchor of anchors) {
    const share = totalWeight > 0 ? Math.max(0, anchor.weight) / totalWeight : 1 / anchors.length
    const slots = Math.max(1, Math.round(count * share))
    const anchorDate = new Date(anchor.depart_date)
    const anchorDaysFromStart = Math.round(
      (anchorDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (anchorDaysFromStart < 0 || anchorDaysFromStart > totalDays) continue

    for (let i = 0; i < slots; i++) {
      // ±3 day jitter around the anchor.
      const jitter = Math.floor(rng() * 7) - 3
      const daysFromStart = Math.max(0, Math.min(totalDays, anchorDaysFromStart + jitter))
      addCandidateForStartDay(
        startDate,
        endDate,
        daysFromStart,
        tripLengthMin,
        tripLengthMax,
        candidates,
        seen,
        params,
        undefined,
        rng
      )
      if (candidates.length >= count) return
    }
  }
}

/**
 * Add a candidate for a specific start day, sampling different trip lengths.
 */
function addCandidateForStartDay(
  startDate: Date,
  endDate: Date,
  daysFromStart: number,
  tripLengthMin: number,
  tripLengthMax: number,
  candidates: DateCandidate[],
  seen: Set<string>,
  params: DateExplorationParams,
  position?: "early" | "mid" | "late",
  rng: () => number = Math.random
): DateCandidate | null {
  const departDate = new Date(startDate)
  departDate.setDate(departDate.getDate() + daysFromStart)

  if (departDate >= endDate) return null

  const tripLengthRange = tripLengthMax - tripLengthMin

  let sampledLength: number
  const randomValue = rng()

  if (randomValue < 0.4) {
    sampledLength = tripLengthMin + Math.floor(rng() * (tripLengthRange + 1))
  } else if (randomValue < 0.7) {
    const shorterRange = Math.max(1, Math.floor(tripLengthRange * 0.5))
    sampledLength = tripLengthMin + Math.floor(rng() * shorterRange)
  } else {
    const longerRangeStart = Math.floor(tripLengthRange * 0.5)
    sampledLength =
      tripLengthMin +
      longerRangeStart +
      Math.floor(rng() * Math.max(1, tripLengthRange - longerRangeStart + 1))
  }
  
  sampledLength = Math.max(tripLengthMin, Math.min(tripLengthMax, sampledLength))

  // Ensure we have at least one sample at min, median, and max lengths for coverage
  const existingLengths = new Set(candidates.map(c => c.trip_length_days))
  if (existingLengths.size < 3) {
    // If we don't have much diversity yet, prioritize min, median, max
    if (!existingLengths.has(tripLengthMin)) {
      sampledLength = tripLengthMin
    } else if (!existingLengths.has(tripLengthMax)) {
      sampledLength = tripLengthMax
    } else {
      const median = Math.floor((tripLengthMin + tripLengthMax) / 2)
      if (!existingLengths.has(median)) {
        sampledLength = median
      }
    }
  }

  const returnDate = new Date(departDate)
  returnDate.setDate(returnDate.getDate() + sampledLength)

  // Reject candidates that overrun the window. Previously we mutated departDate
  // backward to make it fit, which silently shifted the candidate to a different
  // start day and made its position label ("early"/"mid"/"late") incorrect.
  if (returnDate > endDate) return null

  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const progress = totalDays > 0 ? daysFromStart / totalDays : 0

  const finalPosition: "early" | "mid" | "late" = position || (
    progress < 0.33 ? "early" : progress < 0.66 ? "mid" : "late"
  )

  const departStr = departDate.toISOString().split("T")[0]
  const returnStr = returnDate.toISOString().split("T")[0]
  const key = `${departStr}:${returnStr}`

  if (seen.has(key)) return null
  if (departStr < params.start_date || returnStr > params.end_date) return null

  const candidate: DateCandidate = {
    depart_date: departStr,
    return_date: returnStr,
    trip_length_days: sampledLength,
    start_date_position: finalPosition,
  }

  candidates.push(candidate)
  seen.add(key)
  return candidate
}

/**
 * Create a candidate with a specific trip length.
 */
function createCandidateWithTripLength(
  startDate: Date,
  endDate: Date,
  daysFromStart: number,
  tripLength: number,
  seen: Set<string>,
  position: "early" | "mid" | "late"
): DateCandidate | null {
  const departDate = new Date(startDate)
  departDate.setDate(departDate.getDate() + daysFromStart)

  const returnDate = new Date(departDate)
  returnDate.setDate(returnDate.getDate() + tripLength)

  if (returnDate > endDate) return null

  const departStr = departDate.toISOString().split("T")[0]
  const returnStr = returnDate.toISOString().split("T")[0]
  const key = `${departStr}:${returnStr}`

  if (seen.has(key)) return null

  return {
    depart_date: departStr,
    return_date: returnStr,
    trip_length_days: tripLength,
    start_date_position: position,
  }
}

/**
 * Ensure we have coverage across all trip lengths in the range.
 * For ranges > 5 days, sample key lengths (min, 25%, 50%, 75%, max).
 * For smaller ranges, try to cover all lengths.
 */
function ensureTripLengthCoverage(
  candidates: DateCandidate[],
  startDate: Date,
  endDate: Date,
  tripLengthMin: number,
  tripLengthMax: number,
  seen: Set<string>,
  params: DateExplorationParams
) {
  const existingLengths = new Set(candidates.map(c => c.trip_length_days))
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const tripLengthRange = tripLengthMax - tripLengthMin

  // Sample points across the range for coverage
  const coveragePoints = [
    { progress: 0.2, position: "early" as const },
    { progress: 0.5, position: "mid" as const },
    { progress: 0.8, position: "late" as const },
  ]

  // Determine which trip lengths to ensure coverage for
  const lengthsToCover: number[] = []
  
  if (tripLengthRange <= 5) {
    // Small range: try to cover all lengths
    for (let length = tripLengthMin; length <= tripLengthMax; length++) {
      if (!existingLengths.has(length)) {
        lengthsToCover.push(length)
      }
    }
  } else {
    // Larger range: ensure coverage of key points (min, 25%, 50%, 75%, max)
    const keyLengths = [
      tripLengthMin,
      tripLengthMin + Math.floor(tripLengthRange * 0.25),
      tripLengthMin + Math.floor(tripLengthRange * 0.5),
      tripLengthMin + Math.floor(tripLengthRange * 0.75),
      tripLengthMax,
    ]
    
    for (const length of keyLengths) {
      if (!existingLengths.has(length)) {
        lengthsToCover.push(length)
      }
    }
  }

  // Add candidates for missing trip lengths
  for (const length of lengthsToCover) {
    for (const point of coveragePoints) {
      const daysFromStart = Math.floor(totalDays * point.progress)
      const candidate = createCandidateWithTripLength(
        startDate,
        endDate,
        daysFromStart,
        length,
        seen,
        point.position
      )
      
      if (candidate) {
        candidates.push(candidate)
        seen.add(`${candidate.depart_date}:${candidate.return_date}`)
        break
      }
    }
  }

  // Ensure we have at least one max length trip
  if (!existingLengths.has(tripLengthMax) && !lengthsToCover.includes(tripLengthMax)) {
    const midPointDays = Math.floor(totalDays * 0.5)
    const candidate = createCandidateWithTripLength(
      startDate,
      endDate,
      midPointDays,
      tripLengthMax,
      seen,
      "mid"
    )
    if (candidate) {
      candidates.push(candidate)
      seen.add(`${candidate.depart_date}:${candidate.return_date}`)
    }
  }
}

/**
 * Generate minimal candidates when date range is too narrow for normal sampling.
 * Enumerates every viable (depart, return) pair within the small window so we
 * still use the available SerpAPI budget rather than returning a single option.
 */
function generateMinimalCandidates(
  start_date: string,
  end_date: string,
  trip_length_min: number,
  trip_length_max: number
): DateCandidate[] {
  const startDate = new Date(start_date)
  const endDate = new Date(end_date)
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  const candidates: DateCandidate[] = []
  const seen = new Set<string>()

  for (let offset = 0; offset <= totalDays; offset++) {
    for (let length = trip_length_min; length <= trip_length_max; length++) {
      const depart = new Date(startDate)
      depart.setDate(depart.getDate() + offset)
      const ret = new Date(depart)
      ret.setDate(ret.getDate() + length)
      if (ret > endDate) continue

      const departStr = depart.toISOString().split("T")[0]
      const returnStr = ret.toISOString().split("T")[0]
      const key = `${departStr}:${returnStr}`
      if (seen.has(key)) continue
      seen.add(key)

      const progress = totalDays > 0 ? offset / totalDays : 0
      const position: "early" | "mid" | "late" =
        progress < 0.33 ? "early" : progress < 0.66 ? "mid" : "late"

      candidates.push({
        depart_date: departStr,
        return_date: returnStr,
        trip_length_days: length,
        start_date_position: position,
      })
    }
  }

  return candidates
}

/**
 * Shuffle array in place using Fisher-Yates. RNG is parameterised so seeded
 * generation produces the same final ordering on repeat calls.
 */
function shuffleArray<T>(array: T[], rng: () => number = Math.random): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]
  }
}


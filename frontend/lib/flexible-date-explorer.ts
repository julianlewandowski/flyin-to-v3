/**
 * Flexible Date Explorer
 * 
 * Generates flexible, randomized date candidates across the entire date range
 * and trip-length window. Replaces rigid weekly block logic with intelligent
 * exploration that covers early, mid, and late segments of the date range.
 */

export interface DateCandidate {
  depart_date: string // YYYY-MM-DD
  return_date: string // YYYY-MM-DD
  trip_length_days: number
  start_date_position: "early" | "mid" | "late"
}

export interface DateExplorationParams {
  start_date: string // YYYY-MM-DD
  end_date: string // YYYY-MM-DD
  trip_length_min: number
  trip_length_max: number
  target_candidates: number // Target number of candidates (15-25)
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
    // Range too narrow, generate minimal candidates
    return generateMinimalCandidates(start_date, end_date, trip_length_min, trip_length_max)
  }

  const candidates: DateCandidate[] = []
  const seen = new Set<string>() // Track unique date pairs

  // Strategy 1: Evenly spaced samples across the range
  const evenlySpacedCount = Math.floor(target_candidates * 0.3) // 30% evenly spaced
  for (let i = 0; i < evenlySpacedCount; i++) {
    const progress = evenlySpacedCount > 1 ? i / (evenlySpacedCount - 1) : 0
    const daysFromStart = Math.floor(totalDays * progress)
    addCandidateForStartDay(startDate, endDate, daysFromStart, trip_length_min, trip_length_max, candidates, seen, params)
  }

  // Strategy 2: Random jittered samples
  const randomCount = Math.floor(target_candidates * 0.4) // 40% random
  for (let i = 0; i < randomCount; i++) {
    const randomDaysFromStart = Math.floor(Math.random() * (totalDays - trip_length_max))
    addCandidateForStartDay(startDate, endDate, randomDaysFromStart, trip_length_min, trip_length_max, candidates, seen, params)
  }

  // Strategy 3: Smart clustered samples (early, mid, late)
  const clusterCount = Math.floor(target_candidates * 0.3) // 30% clustered
  const segments = [
    { position: "early" as const, range: [0, totalDays * 0.33] },
    { position: "mid" as const, range: [totalDays * 0.33, totalDays * 0.66] },
    { position: "late" as const, range: [totalDays * 0.66, totalDays] },
  ]

  for (const segment of segments) {
    const segmentCount = Math.floor(clusterCount / segments.length)
    for (let i = 0; i < segmentCount; i++) {
      const baseDay = segment.range[0] + (segment.range[1] - segment.range[0]) * (i / (segmentCount || 1))
      const jitteredDay = baseDay + (Math.random() - 0.5) * (segment.range[1] - segment.range[0]) * 0.3
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
        segment.position
      )
      
      // Ensure we have at least one candidate near max trip length in each segment
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

  // Ensure we have coverage of all trip lengths
  ensureTripLengthCoverage(candidates, startDate, endDate, trip_length_min, trip_length_max, seen, params)

  // Shuffle to avoid deterministic patterns
  shuffleArray(candidates)

  // Limit to target count
  return candidates.slice(0, target_candidates)
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
  position?: "early" | "mid" | "late"
): DateCandidate | null {
  const departDate = new Date(startDate)
  departDate.setDate(departDate.getDate() + daysFromStart)

  if (departDate >= endDate) return null

  // Sample trip length with better diversity across the full range
  // Use a more uniform distribution to ensure we get variety (not just 7 or 14 days)
  const tripLengthRange = tripLengthMax - tripLengthMin
  
  // Strategy: Use a mix of uniform and weighted sampling for better diversity
  let sampledLength: number
  const randomValue = Math.random()
  
  if (randomValue < 0.4) {
    // 40%: Uniform distribution across full range (ensures all lengths are possible)
    sampledLength = tripLengthMin + Math.floor(Math.random() * (tripLengthRange + 1))
  } else if (randomValue < 0.7) {
    // 30%: Bias toward shorter trips (cheaper)
    const shorterRange = Math.floor(tripLengthRange * 0.5) // First 50% of range
    sampledLength = tripLengthMin + Math.floor(Math.random() * shorterRange)
  } else {
    // 30%: Bias toward longer trips (more vacation time)
    const longerRangeStart = Math.floor(tripLengthRange * 0.5)
    sampledLength = tripLengthMin + longerRangeStart + Math.floor(Math.random() * (tripLengthRange - longerRangeStart + 1))
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

  if (returnDate > endDate) {
    // Adjust to fit within range
    returnDate.setTime(endDate.getTime())
    const adjustedDepart = new Date(returnDate)
    adjustedDepart.setDate(adjustedDepart.getDate() - sampledLength)
    if (adjustedDepart < startDate) {
      return null
    }
    departDate.setTime(adjustedDepart.getTime())
  }

  // Determine position if not provided
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const daysFromStartActual = Math.ceil((departDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const progress = totalDays > 0 ? daysFromStartActual / totalDays : 0
  
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

  if (returnDate > endDate) {
    returnDate.setTime(endDate.getTime())
    const adjustedDepart = new Date(returnDate)
    adjustedDepart.setDate(adjustedDepart.getDate() - tripLength)
    if (adjustedDepart < startDate) return null
    departDate.setTime(adjustedDepart.getTime())
  }

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
 * Generate minimal candidates when date range is too narrow.
 */
function generateMinimalCandidates(
  start_date: string,
  end_date: string,
  trip_length_min: number,
  trip_length_max: number
): DateCandidate[] {
  const startDate = new Date(start_date)
  const endDate = new Date(end_date)
  
  const candidates: DateCandidate[] = []
  const avgLength = Math.floor((trip_length_min + trip_length_max) / 2)
  
  const departDate = new Date(startDate)
  const returnDate = new Date(departDate)
  returnDate.setDate(returnDate.getDate() + avgLength)
  
  if (returnDate <= endDate) {
    candidates.push({
      depart_date: startDate.toISOString().split("T")[0],
      return_date: returnDate.toISOString().split("T")[0],
      trip_length_days: avgLength,
      start_date_position: "early",
    })
  }
  
  return candidates
}

/**
 * Shuffle array in place using Fisher-Yates algorithm.
 */
function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]
  }
}


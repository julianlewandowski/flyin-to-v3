/**
 * Anchor-Based Date Generator
 * 
 * Implements deterministic + random date sampling strategy:
 * - Generates ~5 candidate trip pairs per destination
 * - Uses anchor points (Early, Mid, Late) + random samples
 * - Selects 3-5 trip lengths from user's range
 * - For each trip length, generates departure date candidates using anchors
 */

export interface AnchoredDateCandidate {
  origin: string
  destination: string
  depart_date: string // YYYY-MM-DD
  return_date: string // YYYY-MM-DD
  trip_length_days: number
  anchor_type: "early" | "mid" | "late" | "random" | "random_cheap_weekday"
}

export interface PerDestinationCandidateParams {
  origin: string
  destination: string
  earliest_departure: string // YYYY-MM-DD
  latest_return: string // YYYY-MM-DD
  min_length_days: number
  max_length_days: number
}

/**
 * Generate ~5 candidate trip pairs per destination using anchor-based strategy.
 * 
 * Strategy:
 * 1. Select 3-5 trip lengths (always include min, median, max + 1-2 random)
 * 2. For each trip length, generate departure dates using:
 *    - Early Anchor (earliest_departure)
 *    - Mid Anchor (halfway point)
 *    - Late Anchor (latest_return - trip_length)
 *    - Random Sample 1
 *    - Random Sample 2 (bias toward cheap weekdays)
 */
export function generateCandidatesPerDestination(
  params: PerDestinationCandidateParams
): AnchoredDateCandidate[] {
  const {
    origin,
    destination,
    earliest_departure,
    latest_return,
    min_length_days,
    max_length_days,
  } = params

  const earliestDate = new Date(earliest_departure)
  const latestDate = new Date(latest_return)
  const totalDays = Math.ceil((latestDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24))

  if (totalDays < min_length_days) {
    // Range too narrow, generate minimal candidates
    return generateMinimalPerDestination(params)
  }

  const candidates: AnchoredDateCandidate[] = []
  const seen = new Set<string>() // Track unique date pairs

  // Step 1: Select 3-5 trip lengths
  const tripLengths = selectTripLengths(min_length_days, max_length_days)

  // Step 2: For each trip length, generate departure date candidates
  for (const tripLength of tripLengths) {
    const departDateCandidates = generateDepartureDatesForTripLength(
      earliestDate,
      latestDate,
      tripLength,
      totalDays
    )

    // Create candidate pairs for each departure date
    for (const { departDate, anchorType } of departDateCandidates) {
      const returnDate = new Date(departDate)
      returnDate.setDate(returnDate.getDate() + tripLength)

      // Ensure return date doesn't exceed latest_return
      if (returnDate > latestDate) {
        continue // Skip this candidate
      }

      const departStr = departDate.toISOString().split("T")[0]
      const returnStr = returnDate.toISOString().split("T")[0]
      const key = `${origin}:${destination}:${departStr}:${returnStr}`

      if (seen.has(key)) continue
      if (departStr < earliest_departure || returnStr > latest_return) continue

      candidates.push({
        origin,
        destination,
        depart_date: departStr,
        return_date: returnStr,
        trip_length_days: tripLength,
        anchor_type: anchorType,
      })

      seen.add(key)
    }
  }

  // Limit to ~5 candidates per destination (may be slightly more)
  return candidates.slice(0, Math.max(5, candidates.length))
}

/**
 * Select 3-5 trip lengths from the user's range.
 * Always includes: min, median, max.
 * Adds 1-2 randomly sampled lengths.
 */
function selectTripLengths(min: number, max: number): number[] {
  const lengths: number[] = []
  const seen = new Set<number>()

  // Always include min, median, max
  const median = Math.floor((min + max) / 2)
  
  lengths.push(min)
  seen.add(min)
  
  if (median !== min && median !== max) {
    lengths.push(median)
    seen.add(median)
  }
  
  if (max !== min) {
    lengths.push(max)
    seen.add(max)
  }

  // Add 1-2 random samples
  const range = max - min
  if (range > 0) {
    // Random sample 1
    const random1 = min + Math.floor(Math.random() * (range + 1))
    if (!seen.has(random1)) {
      lengths.push(random1)
      seen.add(random1)
    }

    // Random sample 2 (if range is large enough)
    if (range >= 3) {
      const random2 = min + Math.floor(Math.random() * (range + 1))
      if (!seen.has(random2) && random2 !== random1) {
        lengths.push(random2)
        seen.add(random2)
      }
    }
  }

  return lengths.sort((a, b) => a - b)
}

/**
 * Generate departure date candidates for a specific trip length.
 * Uses anchor points: Early, Mid, Late + 2 random samples.
 */
function generateDepartureDatesForTripLength(
  earliestDate: Date,
  latestDate: Date,
  tripLength: number,
  totalDays: number
): Array<{ departDate: Date; anchorType: AnchoredDateCandidate["anchor_type"] }> {
  const candidates: Array<{ departDate: Date; anchorType: AnchoredDateCandidate["anchor_type"] }> = []

  // 1. Early Anchor: Start date = earliest_departure
  const earlyDepart = new Date(earliestDate)
  if (isValidDeparture(earlyDepart, latestDate, tripLength)) {
    candidates.push({ departDate: earlyDepart, anchorType: "early" })
  }

  // 2. Mid Anchor: Start date = halfway point
  const midDaysFromStart = Math.floor(totalDays / 2)
  const midDepart = new Date(earliestDate)
  midDepart.setDate(midDepart.getDate() + midDaysFromStart)
  if (isValidDeparture(midDepart, latestDate, tripLength)) {
    candidates.push({ departDate: midDepart, anchorType: "mid" })
  }

  // 3. Late Anchor: Start date = latest_return - trip_length
  const lateDepart = new Date(latestDate)
  lateDepart.setDate(lateDepart.getDate() - tripLength)
  if (isValidDeparture(lateDepart, latestDate, tripLength) && lateDepart >= earliestDate) {
    candidates.push({ departDate: lateDepart, anchorType: "late" })
  }

  // 4. Random Sample 1: Random start date inside range
  const randomDaysFromStart = Math.floor(Math.random() * Math.max(0, totalDays - tripLength))
  const randomDepart = new Date(earliestDate)
  randomDepart.setDate(randomDepart.getDate() + randomDaysFromStart)
  if (isValidDeparture(randomDepart, latestDate, tripLength)) {
    candidates.push({ departDate: randomDepart, anchorType: "random" })
  }

  // 5. Random Sample 2: Random start date with bias toward cheap weekdays (Tue, Wed, Sat)
  let cheapWeekdayDepart: Date | null = null
  for (let attempt = 0; attempt < 10; attempt++) {
    const randomDays = Math.floor(Math.random() * Math.max(0, totalDays - tripLength))
    const candidate = new Date(earliestDate)
    candidate.setDate(candidate.getDate() + randomDays)
    
    const weekday = candidate.getDay() // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    const isCheapWeekday = weekday === 2 || weekday === 3 || weekday === 6 // Tue, Wed, Sat
    
    if (isCheapWeekday && isValidDeparture(candidate, latestDate, tripLength)) {
      cheapWeekdayDepart = candidate
      break
    }
  }

  // If we didn't find a cheap weekday, use any valid random date
  if (!cheapWeekdayDepart) {
    const randomDays2 = Math.floor(Math.random() * Math.max(0, totalDays - tripLength))
    const randomDepart2 = new Date(earliestDate)
    randomDepart2.setDate(randomDepart2.getDate() + randomDays2)
    if (isValidDeparture(randomDepart2, latestDate, tripLength)) {
      cheapWeekdayDepart = randomDepart2
    }
  }

  if (cheapWeekdayDepart) {
    candidates.push({ departDate: cheapWeekdayDepart, anchorType: "random_cheap_weekday" })
  }

  // Remove duplicates based on date
  const uniqueCandidates: Array<{ departDate: Date; anchorType: AnchoredDateCandidate["anchor_type"] }> = []
  const seenDates = new Set<string>()
  
  for (const candidate of candidates) {
    const dateStr = candidate.departDate.toISOString().split("T")[0]
    if (!seenDates.has(dateStr)) {
      seenDates.add(dateStr)
      uniqueCandidates.push(candidate)
    }
  }

  return uniqueCandidates
}

/**
 * Check if a departure date is valid (return date would be within range).
 */
function isValidDeparture(
  departDate: Date,
  latestReturn: Date,
  tripLength: number
): boolean {
  const returnDate = new Date(departDate)
  returnDate.setDate(returnDate.getDate() + tripLength)
  return returnDate <= latestReturn
}

/**
 * Generate minimal candidates when date range is too narrow.
 */
function generateMinimalPerDestination(
  params: PerDestinationCandidateParams
): AnchoredDateCandidate[] {
  const { origin, destination, earliest_departure, latest_return, min_length_days, max_length_days } = params

  const earliestDate = new Date(earliest_departure)
  const latestDate = new Date(latest_return)
  const avgLength = Math.floor((min_length_days + max_length_days) / 2)

  const departDate = new Date(earliestDate)
  const returnDate = new Date(departDate)
  returnDate.setDate(returnDate.getDate() + avgLength)

  if (returnDate <= latestDate) {
    return [{
      origin,
      destination,
      depart_date: departDate.toISOString().split("T")[0],
      return_date: returnDate.toISOString().split("T")[0],
      trip_length_days: avgLength,
      anchor_type: "early",
    }]
  }

  return []
}


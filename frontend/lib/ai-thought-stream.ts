/**
 * AI Thought Stream
 * 
 * Provides user-visible "AI Thinking Process" messages that are friendly
 * and non-technical. These messages simulate thinking in a helpful way
 * without exposing internal chain-of-thought or model internals.
 */

export type ThoughtStreamCallback = (thought: string) => void | Promise<void>

/**
 * Emit a user-visible thought message.
 * 
 * These messages should be friendly, non-technical, and simulate helpful
 * AI thinking without exposing internal implementation details.
 */
export function emitUserThought(
  callback: ThoughtStreamCallback,
  message: string
): void | Promise<void> {
  if (!callback) return
  
  try {
    const result = callback(message)
    if (result instanceof Promise) {
      return result.catch((error) => {
        console.error("[AI Thought Stream] Error emitting thought:", error)
      })
    }
  } catch (error) {
    console.error("[AI Thought Stream] Error emitting thought:", error)
  }
}

/**
 * Pre-defined thought messages for common scenarios.
 */
export const ThoughtMessages = {
  exploringDates: (count: number) => `Exploring ${count} different date combinations across your travel window...`,
  checkingTripLength: (days: number) => `Checking ${days}-day trips...`,
  comparingDates: () => "Comparing average prices across multiple date options...",
  evaluatingDestinations: (destination: string) => `Evaluating flights to ${destination}...`,
  analyzingEarlyDates: (destination?: string) => destination 
    ? `Exploring early May departure dates for ${destination}...`
    : "Analyzing early departure dates for best prices...",
  analyzingMidDates: () => "Analyzing mid-range departure dates...",
  analyzingLateDates: () => "Analyzing late departure dates...",
  samplingTripLengths: (min: number, max: number) => `Evaluating trip lengths between ${min}-${max} days...`,
  filteringCandidates: (count: number) => `Narrowing down ${count} date options to the best candidates...`,
  checkingPrices: (destination: string, date: string) => `Checking prices for ${destination} on ${date}...`,
  rankingOptions: () => "Ranking flight options by price and preference match...",
  finalizingSearch: () => "Finalizing the best flight search options...",
  exploringDestinationDates: (destination: string, month: string) => `Exploring early ${month} departure dates for ${destination}...`,
  comparingAllDestinations: () => "Comparing all destinations to find the best date combinations...",
  checkingWeekdayPatterns: () => "Checking which destinations look promising based on day-of-week patterns...",
  selectingTop5: () => "Selecting the top 5 date combinations globally for real-time price search...",
}

/**
 * Stream a sequence of thoughts for date exploration.
 */
export async function streamDateExplorationThoughts(
  callback: ThoughtStreamCallback,
  params: {
    tripLengthMin: number
    tripLengthMax: number
    candidateCount: number
  }
): Promise<void> {
  emitUserThought(callback, ThoughtMessages.samplingTripLengths(params.tripLengthMin, params.tripLengthMax))
  await delay(300)
  
  emitUserThought(callback, ThoughtMessages.analyzingEarlyDates())
  await delay(300)
  
  emitUserThought(callback, ThoughtMessages.analyzingMidDates())
  await delay(300)
  
  emitUserThought(callback, ThoughtMessages.exploringDates(params.candidateCount))
  await delay(300)
}

/**
 * Stream thoughts for candidate filtering.
 */
export async function streamFilteringThoughts(
  callback: ThoughtStreamCallback,
  candidateCount: number
): Promise<void> {
  emitUserThought(callback, ThoughtMessages.filteringCandidates(candidateCount))
  await delay(400)
  
  emitUserThought(callback, ThoughtMessages.comparingDates())
  await delay(400)
  
  emitUserThought(callback, ThoughtMessages.rankingOptions())
  await delay(300)
}

/**
 * Stream thoughts for destination evaluation.
 */
export async function streamDestinationThoughts(
  callback: ThoughtStreamCallback,
  destination: string
): Promise<void> {
  emitUserThought(callback, ThoughtMessages.evaluatingDestinations(destination))
  await delay(300)
}

/**
 * Delay helper for spacing out thought messages.
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}


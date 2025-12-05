/**
 * LLM Flight Scorer
 * 
 * Uses an LLM to evaluate and score FlightOffers against user preferences.
 * Returns scored offers with reasoning and match details.
 */

import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import type { FlightOffer, FlightPreferences, ScoredFlightOffer } from "./types"

const ScoringSchema = z.object({
  score: z.number().min(0).max(100).describe("Overall score from 0-100"),
  reasoning: z.string().describe("Explanation of why this score was given"),
  match_details: z.object({
    budget_match: z.number().min(0).max(1).optional().describe("How well it matches budget (0-1)"),
    time_match: z.number().min(0).max(1).optional().describe("How well departure/arrival times match (0-1)"),
    layover_match: z.number().min(0).max(1).optional().describe("How well layovers match preferences (0-1)"),
    airline_match: z.number().min(0).max(1).optional().describe("How well airlines match preferences (0-1)"),
    overall_fit: z.number().min(0).max(1).optional().describe("Overall fit score (0-1)"),
  }),
})

type ScoringResult = z.infer<typeof ScoringSchema>

/**
 * Score a single flight offer against user preferences
 */
export async function scoreFlightOffer(
  offer: FlightOffer,
  preferences: FlightPreferences,
): Promise<ScoredFlightOffer> {
  const prompt = buildScoringPrompt(offer, preferences)

  try {
    const { object: scoring } = await generateObject({
      model: openai("gpt-4o-mini"), // Use OpenAI provider directly
      schema: ScoringSchema,
      prompt,
      temperature: 0.3,
    })

    return {
      ...offer,
      score: scoring.score,
      reasoning: scoring.reasoning,
      match_details: scoring.match_details,
    }
  } catch (error) {
    console.error("[LLM Scorer] Error scoring flight offer:", error)
    // Return fallback score based on simple rules
    return scoreFlightOfferFallback(offer, preferences)
  }
}

/**
 * Score multiple flight offers in batch
 * Uses parallel processing for efficiency
 */
export async function scoreFlightOffers(
  offers: FlightOffer[],
  preferences: FlightPreferences,
): Promise<ScoredFlightOffer[]> {
  // Score in parallel (be mindful of rate limits)
  const scoredOffers = await Promise.all(
    offers.map((offer) => scoreFlightOffer(offer, preferences).catch((error) => {
      console.error(`[LLM Scorer] Error scoring offer ${offer.id}:`, error)
      return scoreFlightOfferFallback(offer, preferences)
    }))
  )

  // Sort by score (highest first)
  return scoredOffers.sort((a, b) => b.score - a.score)
}

function buildScoringPrompt(offer: FlightOffer, preferences: FlightPreferences): string {
  let prompt = `You are a flight evaluation expert. Score this flight offer against the user's preferences.

FLIGHT OFFER:
- Price: ${offer.price.total} ${offer.price.currency}
- Total Duration: ${Math.round(offer.total_duration_minutes / 60)}h ${offer.total_duration_minutes % 60}m
- Number of Stops: ${offer.num_stops}
- Cabin Class: ${offer.class}
- Segments: ${offer.segments.length}
`

  if (offer.segments.length > 0) {
    prompt += `- Departure: ${offer.segments[0].from.city} (${offer.segments[0].from.code}) at ${new Date(offer.segments[0].departure).toLocaleString()}\n`
    prompt += `- Arrival: ${offer.segments[offer.segments.length - 1].to.city} (${
      offer.segments[offer.segments.length - 1].to.code
    }) at ${new Date(offer.segments[offer.segments.length - 1].arrival).toLocaleString()}\n`
  }

  if (offer.layovers.length > 0) {
    prompt += `- Layovers: ${offer.layovers.map((l) => `${l.airport} (${Math.round(l.duration_minutes / 60)}h ${l.duration_minutes % 60}m)`).join(", ")}\n`
  }

  prompt += `- Airlines: ${offer.segments.map((s) => s.airline.name).join(", ")}\n`
  if (offer.notes.length > 0) {
    prompt += `- Notes: ${offer.notes.join(", ")}\n`
  }

  prompt += `\nUSER PREFERENCES:\n`

  if (preferences.budget) {
    prompt += `- Budget: Max ${preferences.budget.max} ${preferences.budget.currency}${preferences.budget.flexible ? " (flexible)" : ""}\n`
  }

  if (preferences.preferred_times?.departure_window) {
    const dw = preferences.preferred_times.departure_window
    if (dw.earliest_hour !== undefined || dw.latest_hour !== undefined) {
      prompt += `- Departure Window: ${dw.earliest_hour || "any"}:00 - ${dw.latest_hour || "any"}:00\n`
    }
    if (dw.preferred_hours?.length) {
      prompt += `- Preferred Departure Hours: ${dw.preferred_hours.join(", ")}:00\n`
    }
  }

  if (preferences.layover_tolerance) {
    const lt = preferences.layover_tolerance
    if (lt.max_layovers !== undefined) {
      prompt += `- Max Layovers: ${lt.max_layovers}\n`
    }
    if (lt.preferred_airports?.length) {
      prompt += `- Preferred Connection Airports: ${lt.preferred_airports.join(", ")}\n`
    }
    if (lt.avoid_airports?.length) {
      prompt += `- Avoid Airports: ${lt.avoid_airports.join(", ")}\n`
    }
  }

  if (preferences.preferred_airlines?.length) {
    prompt += `- Preferred Airlines: ${preferences.preferred_airlines.join(", ")}\n`
  }

  if (preferences.avoid_airlines?.length) {
    prompt += `- Avoid Airlines: ${preferences.avoid_airlines.join(", ")}\n`
  }

  if (preferences.cabin_class) {
    prompt += `- Preferred Cabin Class: ${preferences.cabin_class}\n`
  }

  prompt += `\nEvaluate this flight offer and provide:
1. Overall score (0-100): 100 = perfect match, 0 = terrible match
2. Reasoning: Brief explanation of the score
3. Match details: Scores for budget_match, time_match, layover_match, airline_match, overall_fit (each 0-1)

Consider:
- Price relative to budget
- Departure/arrival times vs preferences
- Layover count and duration vs tolerance
- Airlines vs preferred/avoided lists
- Overall journey quality (duration, stops, cabin class)`

  return prompt
}

/**
 * Fallback scoring when LLM fails
 * Uses simple rule-based scoring
 */
function scoreFlightOfferFallback(offer: FlightOffer, preferences: FlightPreferences): ScoredFlightOffer {
  let score = 50 // Base score
  const details: ScoredFlightOffer["match_details"] = {}

  // Budget match
  if (preferences.budget?.max) {
    const priceRatio = offer.price.total / preferences.budget.max
    if (priceRatio <= 1.0) {
      details.budget_match = 1.0
      score += 20
    } else if (priceRatio <= 1.2 && preferences.budget.flexible) {
      details.budget_match = 0.7
      score += 10
    } else {
      details.budget_match = Math.max(0, 1 - (priceRatio - 1))
      score -= 20
    }
  }

  // Layover match
  if (preferences.layover_tolerance?.max_layovers !== undefined) {
    if (offer.num_stops <= preferences.layover_tolerance.max_layovers) {
      details.layover_match = 1.0
      score += 15
    } else {
      details.layover_match = 0.3
      score -= 15
    }
  }

  // Airline match
  if (preferences.preferred_airlines?.length) {
    const hasPreferred = offer.segments.some((s) =>
      preferences.preferred_airlines!.some((pa) =>
        s.airline.name.toLowerCase().includes(pa.toLowerCase()) || s.airline.code === pa,
      ),
    )
    if (hasPreferred) {
      details.airline_match = 1.0
      score += 10
    }
  }

  if (preferences.avoid_airlines?.length) {
    const hasAvoided = offer.segments.some((s) =>
      preferences.avoid_airlines!.some((aa) =>
        s.airline.name.toLowerCase().includes(aa.toLowerCase()) || s.airline.code === aa,
      ),
    )
    if (hasAvoided) {
      details.airline_match = 0.2
      score -= 20
    }
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score))
  details.overall_fit = score / 100

  return {
    ...offer,
    score,
    reasoning: `Rule-based scoring: Budget ${details.budget_match?.toFixed(2) || "N/A"}, Layovers ${details.layover_match?.toFixed(2) || "N/A"}, Airlines ${details.airline_match?.toFixed(2) || "N/A"}`,
    match_details: details,
  }
}


/**
 * LLM Preference Interpreter
 * 
 * Uses an LLM to extract structured flight preferences from natural language
 * user input or holiday configuration.
 * 
 * This converts unstructured preferences into FlightPreferences that can be
 * used for filtering and scoring flights.
 */

import { generateObject } from "ai"
import { z } from "zod"
import type { FlightPreferences } from "./types"

const FlightPreferencesSchema = z.object({
  budget: z
    .object({
      max: z.number().optional(),
      currency: z.string().optional(),
      flexible: z.boolean().optional(),
    })
    .optional(),
  preferred_times: z
    .object({
      departure_window: z
        .object({
          earliest_hour: z.number().min(0).max(23).optional(),
          latest_hour: z.number().min(0).max(23).optional(),
          preferred_hours: z.array(z.number().min(0).max(23)).optional(),
        })
        .optional(),
      arrival_window: z
        .object({
          earliest_hour: z.number().min(0).max(23).optional(),
          latest_hour: z.number().min(0).max(23).optional(),
        })
        .optional(),
    })
    .optional(),
  layover_tolerance: z
    .object({
      max_layovers: z.number().min(0).optional(),
      min_layover_minutes: z.number().min(0).optional(),
      max_layover_minutes: z.number().min(0).optional(),
      preferred_airports: z.array(z.string()).optional(),
      avoid_airports: z.array(z.string()).optional(),
    })
    .optional(),
  preferred_airlines: z.array(z.string()).optional(),
  avoid_airlines: z.array(z.string()).optional(),
  trip_duration: z
    .object({
      min_days: z.number().min(0).optional(),
      max_days: z.number().min(0).optional(),
    })
    .optional(),
  climate_preferences: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
  cabin_class: z.enum(["Economy", "Premium Economy", "Business", "First"]).optional(),
  special_requirements: z.array(z.string()).optional(),
})

type ExtractedPreferences = z.infer<typeof FlightPreferencesSchema>

export interface PreferenceExtractionInput {
  natural_language?: string // User's natural language description
  holiday?: {
    budget?: number | null
    trip_duration_min?: number
    trip_duration_max?: number
    preferred_weekdays?: string[]
    max_layovers?: number
    origin?: string
    destinations?: string[]
    start_date?: string
    end_date?: string
  }
  additional_context?: string // Any other context
}

/**
 * Extract structured preferences from user input using LLM
 */
export async function extractPreferences(input: PreferenceExtractionInput): Promise<FlightPreferences> {
  // Build the prompt
  const prompt = buildPreferencePrompt(input)

  try {
    const { object: preferences } = await generateObject({
      model: "openai/gpt-4o-mini", // Match existing pattern in ai-scout.ts
      schema: FlightPreferencesSchema,
      prompt,
      temperature: 0.3, // Lower temperature for more consistent extraction
    })

    return preferences as FlightPreferences
  } catch (error) {
    console.error("[LLM Preferences] Error extracting preferences:", error)
    // Return fallback preferences based on structured data
    return extractPreferencesFallback(input)
  }
}

function buildPreferencePrompt(input: PreferenceExtractionInput): string {
  let prompt = `You are a flight preference extraction system. Extract structured flight preferences from the following user input.

`

  if (input.natural_language) {
    prompt += `User's natural language description:\n${input.natural_language}\n\n`
  }

  if (input.holiday) {
    prompt += `Holiday configuration:\n`
    if (input.holiday.budget) {
      prompt += `- Budget: ${input.holiday.budget} EUR\n`
    }
    if (input.holiday.trip_duration_min || input.holiday.trip_duration_max) {
      prompt += `- Trip duration: ${input.holiday.trip_duration_min || "?"} - ${
        input.holiday.trip_duration_max || "?"
      } days\n`
    }
    if (input.holiday.preferred_weekdays?.length) {
      prompt += `- Preferred weekdays: ${input.holiday.preferred_weekdays.join(", ")}\n`
    }
    if (input.holiday.max_layovers !== undefined) {
      prompt += `- Max layovers: ${input.holiday.max_layovers}\n`
    }
    if (input.holiday.origin) {
      prompt += `- Origin: ${input.holiday.origin}\n`
    }
    if (input.holiday.destinations?.length) {
      prompt += `- Destinations: ${input.holiday.destinations.join(", ")}\n`
    }
    if (input.holiday.start_date && input.holiday.end_date) {
      prompt += `- Dates: ${input.holiday.start_date} to ${input.holiday.end_date}\n`
    }
    prompt += `\n`
  }

  if (input.additional_context) {
    prompt += `Additional context:\n${input.additional_context}\n\n`
  }

  prompt += `Extract the following preferences:
- Budget constraints (max amount, currency, flexibility)
- Preferred departure/arrival times (time windows, preferred hours)
- Layover tolerance (max layovers, connection times, preferred/avoided airports)
- Preferred/avoided airlines
- Trip duration preferences
- Climate preferences (if mentioned)
- Preferred regions/countries
- Cabin class preference
- Special requirements (wheelchair access, pet-friendly, etc.)

Return only the preferences that are explicitly stated or can be reasonably inferred. Leave optional fields empty if not mentioned.`

  return prompt
}

/**
 * Fallback preference extraction when LLM fails
 * Uses structured data from holiday object
 */
function extractPreferencesFallback(input: PreferenceExtractionInput): FlightPreferences {
  const preferences: FlightPreferences = {}

  if (input.holiday?.budget) {
    preferences.budget = {
      max: input.holiday.budget,
      currency: "EUR",
      flexible: false,
    }
  }

  if (input.holiday?.max_layovers !== undefined) {
    preferences.layover_tolerance = {
      max_layovers: input.holiday.max_layovers,
    }
  }

  if (input.holiday?.trip_duration_min || input.holiday?.trip_duration_max) {
    preferences.trip_duration = {
      min_days: input.holiday.trip_duration_min,
      max_days: input.holiday.trip_duration_max,
    }
  }

  return preferences
}


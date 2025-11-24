export interface Holiday {
  id: string
  user_id: string
  name: string
  origin: string
  origins?: string[]
  destinations: string[]
  start_date: string
  end_date: string
  budget: number | null
  trip_duration_min?: number
  trip_duration_max?: number
  preferred_weekdays?: string[]
  max_layovers?: number
  use_ai_discovery?: boolean
  ai_discovery_results?: AIDiscoveryResult[]
  last_ai_scan?: string
  created_at: string
  updated_at: string
}

export interface Flight {
  id: string
  holiday_id: string
  origin: string
  destination: string
  departure_date: string
  return_date: string | null
  price: number
  old_price?: number | null
  airline: string | null
  booking_link: string | null
  source?: string
  verified_at?: string
  track_id?: string
  fare_id?: string
  referral_link?: string
  baggage_info?: BaggageInfo
  layovers?: number
  flight_duration?: string
  last_checked: string
  created_at: string
}

export interface AIInsight {
  id: string
  holiday_id: string
  insight_text: string
  insight_type: "price_trend" | "best_time" | "alternative_destination" | "general"
  created_at: string
}

export interface AIDiscoveryResult {
  origin: string
  destination: string
  depart: string
  return: string
  estimated_price?: number
  confidence?: number
}

export interface BaggageInfo {
  cabin?: string
  checked?: string
}

export interface Alert {
  id: string
  holiday_id: string
  flight_id: string
  old_price: number
  new_price: number
  price_drop_percent: number
  notified: boolean
  created_at: string
}

export interface AirhobSearchRequest {
  TripType: "R" | "O"
  NoOfAdults: number
  ClassType: "Economy" | "Business" | "First"
  OriginDestination: Array<{
    Origin: string
    Destination: string
    TravelDate: string
  }>
  Currency: string
}

export interface AirhobLookRequest {
  TrackId: string
  FareId: string
}

// ============================================================================
// FlightOffer Schema - Unified provider-agnostic flight representation
// ============================================================================

export interface AirportInfo {
  code: string // IATA code (e.g., "DUB", "JFK")
  city: string
  country: string
}

export interface FlightSegment {
  from: AirportInfo
  to: AirportInfo
  departure: string // ISO 8601 datetime string
  arrival: string // ISO 8601 datetime string
  airline: {
    code: string // IATA airline code (e.g., "AA", "BA")
    name: string
  }
  flight_number: string // e.g., "BA123"
  duration_minutes: number
  aircraft?: string // e.g., "Boeing 737-800"
}

export interface Layover {
  airport: string // IATA code
  duration_minutes: number
}

export interface FlightOffer {
  id: string // Unique identifier for this offer
  provider: string // Source: "serpapi", "airhob", "kiwi", etc.
  price: {
    total: number // Total price in base currency
    currency: string // ISO 4217 currency code (e.g., "USD", "EUR")
  }
  segments: FlightSegment[] // Array of flight legs
  layovers: Layover[] // Array of layover information
  total_duration_minutes: number // Total journey time including layovers
  num_stops: number // Number of stops (0 = direct, 1+ = connections)
  class: "Economy" | "Premium Economy" | "Business" | "First" | string
  booking_link: string // URL to book this flight
  notes: string[] // Additional notes or warnings
}

// ============================================================================
// User Preferences (extracted from natural language by LLM)
// ============================================================================

export interface FlightPreferences {
  budget?: {
    max: number
    currency: string
    flexible?: boolean // If true, can slightly exceed budget for better options
  }
  preferred_times?: {
    departure_window?: {
      earliest_hour?: number // 0-23
      latest_hour?: number // 0-23
      preferred_hours?: number[] // e.g., [8, 9, 10] for morning flights
    }
    arrival_window?: {
      earliest_hour?: number
      latest_hour?: number
    }
  }
  layover_tolerance?: {
    max_layovers?: number // 0 for direct only, undefined for any
    min_layover_minutes?: number // Minimum connection time
    max_layover_minutes?: number // Maximum acceptable layover
    preferred_airports?: string[] // Preferred connection airports (IATA codes)
    avoid_airports?: string[] // Airports to avoid
  }
  preferred_airlines?: string[] // Airline names or codes
  avoid_airlines?: string[] // Airlines to avoid
  trip_duration?: {
    min_days?: number
    max_days?: number
  }
  climate_preferences?: string[] // e.g., ["warm", "beach"], ["ski", "snow"]
  regions?: string[] // Preferred regions/countries
  cabin_class?: "Economy" | "Premium Economy" | "Business" | "First"
  special_requirements?: string[] // e.g., ["wheelchair", "pet-friendly"]
}

// ============================================================================
// Scored Flight Offer (FlightOffer + LLM evaluation)
// ============================================================================

export interface ScoredFlightOffer extends FlightOffer {
  score: number // 0-100, where 100 is perfect match
  reasoning: string // Explanation of the score
  match_details: {
    budget_match?: number // 0-1
    time_match?: number // 0-1
    layover_match?: number // 0-1
    airline_match?: number // 0-1
    overall_fit?: number // 0-1
  }
}

// ============================================================================
// SerpApi Google Flights Types
// ============================================================================

export interface SerpApiFlightSearchParams {
  engine: "google_flights"
  departure_id: string // Airport IATA code
  arrival_id: string // Airport IATA code
  outbound_date?: string // YYYY-MM-DD
  return_date?: string // YYYY-MM-DD (optional for round trip)
  currency?: string // USD, EUR, etc.
  hl?: string // Language (e.g., "en")
  adults?: number
  children?: number
  infants?: number
  class?: "economy" | "premium_economy" | "business" | "first"
  sort_by?: 1 | 2 | 3 | 4 | 5 | 6 // 1=Top flights, 2=Price, 3=Departure time, 4=Arrival time, 5=Duration, 6=Emissions
  num?: number // Number of results (max ~100)
}

export interface SerpApiFlightResult {
  // This will be filled based on actual SerpApi response structure
  // We'll normalize this to FlightOffer
  [key: string]: any
}

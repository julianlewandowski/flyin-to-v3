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
  deal_url?: string | null
  provider?: string | null
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

export interface AirportInfo {
  code: string
  city: string
  country: string
}

export interface FlightSegment {
  from: AirportInfo
  to: AirportInfo
  departure: string
  arrival: string
  airline: {
    code: string
    name: string
  }
  flight_number: string
  duration_minutes: number
  aircraft?: string
}

export interface Layover {
  airport: string
  duration_minutes: number
}

export interface FlightOffer {
  id: string
  provider: string
  price: {
    total: number
    currency: string
  }
  segments: FlightSegment[]
  layovers: Layover[]
  total_duration_minutes: number
  num_stops: number
  class: "Economy" | "Premium Economy" | "Business" | "First" | string
  booking_link: string
  deal_url?: string | null
  notes: string[]
}

export interface FlightPreferences {
  budget?: {
    max: number
    currency: string
    flexible?: boolean
  }
  preferred_times?: {
    departure_window?: {
      earliest_hour?: number
      latest_hour?: number
      preferred_hours?: number[]
    }
    arrival_window?: {
      earliest_hour?: number
      latest_hour?: number
    }
  }
  layover_tolerance?: {
    max_layovers?: number
    min_layover_minutes?: number
    max_layover_minutes?: number
    preferred_airports?: string[]
    avoid_airports?: string[]
  }
  preferred_airlines?: string[]
  avoid_airlines?: string[]
  trip_duration?: {
    min_days?: number
    max_days?: number
  }
  climate_preferences?: string[]
  regions?: string[]
  cabin_class?: "Economy" | "Premium Economy" | "Business" | "First"
  special_requirements?: string[]
}

export interface ScoredFlightOffer extends FlightOffer {
  score: number
  reasoning: string
  match_details: {
    budget_match?: number
    time_match?: number
    layover_match?: number
    airline_match?: number
    overall_fit?: number
  }
}

export interface SerpApiFlightSearchParams {
  engine: "google_flights"
  departure_id: string
  arrival_id: string
  outbound_date?: string
  return_date?: string
  currency?: string
  hl?: string
  adults?: number
  children?: number
  infants?: number
  class?: "economy" | "premium_economy" | "business" | "first"
  sort_by?: 1 | 2 | 3 | 4 | 5 | 6
  num?: number
}

export interface SerpApiFlightResult {
  [key: string]: any
}

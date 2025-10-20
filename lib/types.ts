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

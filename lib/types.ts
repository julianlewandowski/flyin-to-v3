export interface Holiday {
  id: string
  user_id: string
  name: string
  origin: string
  destinations: string[]
  start_date: string
  end_date: string
  budget: number | null
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
  airline: string | null
  booking_link: string | null
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

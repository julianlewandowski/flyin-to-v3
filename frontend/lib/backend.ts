import type { Holiday } from "./types"
import { createClient } from "./supabase/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

export async function fetchHolidaysForCurrentUser(): Promise<Holiday[]> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("No authenticated user found")
  }

  // Query holidays directly from Supabase instead of calling backend
  const { data, error } = await supabase
    .from("holidays")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[Backend] Error fetching holidays:", error)
    throw new Error(`Failed to fetch holidays: ${error.message}`)
  }

  // Transform the data to match the Holiday interface
  const holidays: Holiday[] = (data || []).map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    origin: row.origin,
    origins: row.origins || [row.origin],
    destinations: row.destinations || [],
    start_date: row.start_date,
    end_date: row.end_date,
    budget: row.budget,
    trip_duration_min: row.trip_duration_min,
    trip_duration_max: row.trip_duration_max,
    preferred_weekdays: row.preferred_weekdays,
    max_layovers: row.max_layovers,
    use_ai_discovery: row.use_ai_discovery,
    ai_discovery_results: row.ai_discovery_results,
    last_ai_scan: row.last_ai_scan,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))

  return holidays
}

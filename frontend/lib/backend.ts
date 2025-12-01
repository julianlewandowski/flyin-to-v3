import type { Holiday } from "./types"
import { createClient } from "./supabase/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

export async function fetchHolidaysForCurrentUser(): Promise<Holiday[]> {
  const supabase = await createClient()

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error || !session) {
    throw new Error("No Supabase session available for current user")
  }

  const res = await fetch(`${BACKEND_URL}/holidays/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error(`Backend /holidays request failed with status ${res.status}`)
  }

  const data = (await res.json()) as Holiday[]
  return data
}

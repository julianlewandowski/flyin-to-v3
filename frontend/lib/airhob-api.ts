import type { AirhobSearchRequest, AirhobLookRequest } from "./types"

const AIRHOB_BASE_URL = "https://dev-sandbox-api.airhob.com/sandboxapi/flights/v2"

interface AirhobHeaders {
  apikey: string
  mode: string
  "Content-Type": string
}

function getHeaders(): AirhobHeaders {
  const apiKey = process.env.AIRHOB_API_KEY || ""
  return {
    apikey: apiKey,
    mode: "sandbox",
    "Content-Type": "application/json",
  }
}

export async function searchFlights(request: AirhobSearchRequest) {
  try {
    const response = await fetch(`${AIRHOB_BASE_URL}/search`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`Airhob API error: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("[v0] Airhob search error:", error)
    throw error
  }
}

export async function lookupFare(request: AirhobLookRequest) {
  try {
    const response = await fetch(`${AIRHOB_BASE_URL}/look`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`Airhob API error: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("[v0] Airhob look error:", error)
    throw error
  }
}

export async function getAirportList() {
  try {
    const response = await fetch("https://d2yq2mw7185ana.cloudfront.net/devdocs/airhob_airport_list-1.json")

    if (!response.ok) {
      throw new Error(`Airport list fetch error: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("[v0] Airport list fetch error:", error)
    return []
  }
}

// Helper to format date for Airhob (MM/DD/YYYY)
export function formatDateForAirhob(dateString: string): string {
  const date = new Date(dateString)
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const year = date.getFullYear()
  return `${month}/${day}/${year}`
}

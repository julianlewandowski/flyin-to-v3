interface KiwiSearchParams {
  fly_from: string
  fly_to: string
  date_from: string
  date_to: string
  return_from?: string
  return_to?: string
  price_to?: number
  limit?: number
}

interface KiwiFlightData {
  id: string
  flyFrom: string
  flyTo: string
  local_departure: string
  local_arrival: string
  price: number
  airlines: string[]
  deep_link: string
  route: Array<{
    local_departure: string
    local_arrival: string
  }>
}

interface KiwiSearchResponse {
  data: KiwiFlightData[]
}

export async function searchFlights(params: KiwiSearchParams): Promise<KiwiFlightData[]> {
  const apiKey = process.env.KIWI_API_KEY

  if (!apiKey) {
    throw new Error("KIWI_API_KEY is not configured")
  }

  const searchParams = new URLSearchParams({
    fly_from: params.fly_from,
    fly_to: params.fly_to,
    date_from: params.date_from,
    date_to: params.date_to,
    ...(params.return_from && { return_from: params.return_from }),
    ...(params.return_to && { return_to: params.return_to }),
    ...(params.price_to && { price_to: params.price_to.toString() }),
    limit: (params.limit || 10).toString(),
    curr: "USD",
    sort: "price",
  })

  try {
    const response = await fetch(`https://api.tequila.kiwi.com/v2/search?${searchParams.toString()}`, {
      headers: {
        apikey: apiKey,
      },
    })

    if (!response.ok) {
      throw new Error(`Kiwi API error: ${response.status} ${response.statusText}`)
    }

    const data: KiwiSearchResponse = await response.json()
    return data.data || []
  } catch (error) {
    console.error("[v0] Kiwi API search error:", error)
    throw error
  }
}

export function formatDateForKiwi(date: string): string {
  // Convert YYYY-MM-DD to DD/MM/YYYY format required by Kiwi
  const d = new Date(date)
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

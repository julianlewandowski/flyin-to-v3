/**
 * Normalization Layer
 * 
 * Converts raw SerpApi Google Flights results into the unified FlightOffer schema.
 * This layer makes it easy to swap out SerpApi for Duffel/Amadeus later.
 */

import type { FlightOffer, FlightSegment, Layover, AirportInfo, SerpApiFlightResult } from "./types"

/**
 * Parse airport information from SerpApi format
 */
function parseAirport(data: any): AirportInfo {
  // SerpApi format may vary, but typically includes:
  // - airport_id (IATA code)
  // - city, country, or full airport name
  return {
    code: data.airport_id || data.code || data.iata || "",
    city: data.city || data.name?.split(",")?.[0] || "",
    country: data.country || data.name?.split(",")?.[1]?.trim() || "",
  }
}

/**
 * Parse a flight segment from SerpApi format
 */
function parseSegment(segment: any): FlightSegment | null {
  try {
    const departure = parseAirport(segment.departure_airport || segment.from || {})
    const arrival = parseAirport(segment.arrival_airport || segment.to || {})

    if (!departure.code || !arrival.code) {
      return null
    }

    // Parse dates/times
    const departureTime = segment.departure_datetime || segment.departure_time || segment.departure
    const arrivalTime = segment.arrival_datetime || segment.arrival_time || segment.arrival

    // Calculate duration if not provided
    let duration_minutes = segment.duration_minutes || segment.duration
    if (!duration_minutes && departureTime && arrivalTime) {
      const depDate = new Date(departureTime)
      const arrDate = new Date(arrivalTime)
      duration_minutes = Math.round((arrDate.getTime() - depDate.getTime()) / (1000 * 60))
    }

    // Parse airline info
    const airlineCode = segment.airline?.code || segment.airline_code || ""
    const airlineName = segment.airline?.name || segment.airline_name || segment.airline || "Unknown"

    return {
      from: departure,
      to: arrival,
      departure: departureTime || "",
      arrival: arrivalTime || "",
      airline: {
        code: airlineCode,
        name: airlineName,
      },
      flight_number: segment.flight_number || segment.number || "",
      duration_minutes: duration_minutes || 0,
      aircraft: segment.aircraft || segment.plane || undefined,
    }
  } catch (error) {
    console.error("[Normalize] Error parsing segment:", error)
    return null
  }
}

/**
 * Extract layovers from segments
 */
function extractLayovers(segments: FlightSegment[]): Layover[] {
  const layovers: Layover[] = []

  for (let i = 0; i < segments.length - 1; i++) {
    const current = segments[i]
    const next = segments[i + 1]

    if (current.to.code === next.from.code) {
      const arrivalTime = new Date(current.arrival)
      const departureTime = new Date(next.departure)
      const duration_minutes = Math.round((departureTime.getTime() - arrivalTime.getTime()) / (1000 * 60))

      layovers.push({
        airport: current.to.code,
        duration_minutes: Math.max(0, duration_minutes), // Ensure non-negative
      })
    }
  }

  return layovers
}

/**
 * Normalize a single SerpApi flight result to FlightOffer
 */
export function normalizeFlightOffer(serpResult: any, provider: string = "serpapi"): FlightOffer | null {
  try {
    // SerpApi response structure can vary. This is a flexible parser.
    // Adjust based on actual SerpApi response format after testing.
    
    const priceData = serpResult.price || serpResult.total_price || {}
    const total = priceData.total || priceData.value || serpResult.price_value || 0
    const currency = priceData.currency || priceData.currency_code || "USD"

    if (!total || total === 0) {
      return null // Skip offers without valid pricing
    }

    // Parse segments
    const segmentsRaw = serpResult.flights || serpResult.segments || serpResult.route || []
    const segments: FlightSegment[] = []

    for (const seg of segmentsRaw) {
      const parsed = parseSegment(seg)
      if (parsed) {
        segments.push(parsed)
      }
    }

    if (segments.length === 0) {
      return null // Skip if no valid segments
    }

    // Extract layovers
    const layovers = extractLayovers(segments)

    // Calculate total duration
    let total_duration_minutes = serpResult.total_duration_minutes || serpResult.duration_minutes
    if (!total_duration_minutes) {
      // Sum segment durations + layover durations
      const segmentDuration = segments.reduce((sum, seg) => sum + seg.duration_minutes, 0)
      const layoverDuration = layovers.reduce((sum, lay) => sum + lay.duration_minutes, 0)
      total_duration_minutes = segmentDuration + layoverDuration
    }

    // Determine number of stops
    const num_stops = Math.max(0, segments.length - 1)

    // Parse cabin class
    const classStr = serpResult.class || serpResult.cabin_class || "Economy"

    // Get booking link
    const booking_link = serpResult.book_url || serpResult.booking_link || serpResult.link || ""

    // Extract notes
    const notes: string[] = []
    if (serpResult.warnings) {
      notes.push(...serpResult.warnings)
    }
    if (serpResult.bags && !serpResult.bags.included) {
      notes.push("Bags not included")
    }

    // Generate unique ID
    const id = `${provider}_${segments.map((s) => `${s.from.code}-${s.to.code}-${s.flight_number}`).join("_")}_${total}`

    return {
      id,
      provider,
      price: {
        total,
        currency,
      },
      segments,
      layovers,
      total_duration_minutes,
      num_stops,
      class: classStr,
      booking_link,
      notes,
    }
  } catch (error) {
    console.error("[Normalize] Error normalizing flight offer:", error)
    return null
  }
}

/**
 * Normalize multiple SerpApi results into FlightOffers
 * Filters out invalid offers
 */
export function normalizeFlightOffers(serpResults: any[], provider: string = "serpapi"): FlightOffer[] {
  const offers: FlightOffer[] = []

  for (const result of serpResults) {
    const offer = normalizeFlightOffer(result, provider)
    if (offer) {
      offers.push(offer)
    }
  }

  return offers
}

/**
 * Normalize SerpApi response object to FlightOffers array
 * Handles different SerpApi response structures
 */
export function normalizeSerpApiResponse(response: SerpApiFlightResult): FlightOffer[] {
  const offers: FlightOffer[] = []

  try {
    // SerpApi may return results in different formats:
    // - response.best_flights[]
    // - response.other_flights[]
    // - response.flights[]
    // - or nested structures

    const flightsArray =
      response.best_flights ||
      response.other_flights ||
      response.flights ||
      (Array.isArray(response) ? response : [])

    for (const flight of flightsArray) {
      const offer = normalizeFlightOffer(flight, "serpapi")
      if (offer) {
        offers.push(offer)
      }
    }
  } catch (error) {
    console.error("[Normalize] Error parsing SerpApi response:", error)
  }

  return offers
}


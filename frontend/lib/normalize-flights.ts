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
  // SerpApi format: departure_airport/arrival_airport objects have:
  // - id (IATA code)
  // - name (airport name)
  // - time (datetime string)
  // Or it might be an object with airport_id, code, iata, etc.
  return {
    code: data.id || data.airport_id || data.code || data.iata || "",
    city: data.city || data.name?.split(",")?.[0] || "",
    country: data.country || data.name?.split(",")?.[1]?.trim() || "",
  }
}

/**
 * Parse a flight segment from SerpApi format
 */
function parseSegment(segment: any): FlightSegment | null {
  try {
    // SerpApi format: segment has departure_airport and arrival_airport objects
    // Each has: { id, name, time }
    const departureAirport = segment.departure_airport || segment.from || {}
    const arrivalAirport = segment.arrival_airport || segment.to || {}
    
    const departure = parseAirport(departureAirport)
    const arrival = parseAirport(arrivalAirport)

    if (!departure.code || !arrival.code) {
      console.warn("[Normalize] Missing airport codes. Departure:", departure, "Arrival:", arrival)
      return null
    }

    // Parse dates/times - in SerpApi format, time is in departure_airport.time and arrival_airport.time
    const departureTime = departureAirport.time || segment.departure_datetime || segment.departure_time || segment.departure || ""
    const arrivalTime = arrivalAirport.time || segment.arrival_datetime || segment.arrival_time || segment.arrival || ""

    // Duration is provided directly in minutes
    let duration_minutes = segment.duration
    if (!duration_minutes && departureTime && arrivalTime) {
      try {
        const depDate = new Date(departureTime)
        const arrDate = new Date(arrivalTime)
        if (!isNaN(depDate.getTime()) && !isNaN(arrDate.getTime())) {
          duration_minutes = Math.round((arrDate.getTime() - depDate.getTime()) / (1000 * 60))
        }
      } catch (e) {
        // Ignore date parsing errors
      }
    }

    // Parse airline info - can be a string or object
    let airlineCode = ""
    let airlineName = "Unknown"
    
    if (typeof segment.airline === "string") {
      airlineName = segment.airline
    } else if (segment.airline && typeof segment.airline === "object") {
      airlineCode = segment.airline.code || ""
      airlineName = segment.airline.name || "Unknown"
    } else {
      airlineName = segment.airline_name || segment.airline || "Unknown"
      airlineCode = segment.airline_code || ""
    }

    return {
      from: departure,
      to: arrival,
      departure: departureTime,
      arrival: arrivalTime,
      airline: {
        code: airlineCode,
        name: airlineName,
      },
      flight_number: segment.flight_number || segment.number || "",
      duration_minutes: duration_minutes || 0,
      aircraft: segment.airplane || segment.aircraft || segment.plane || undefined,
    }
  } catch (error) {
    console.error("[Normalize] Error parsing segment:", error, "Segment:", segment)
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
export function normalizeFlightOffer(serpResult: any, provider: string = "serpapi", defaultCurrency: string = "USD"): FlightOffer | null {
  try {
    // SerpApi response structure based on documentation:
    // Each flight offer has: flights[], price (number), layovers[], total_duration, etc.
    
    // Price can be a number directly or in an object
    let total = 0
    let currency = defaultCurrency
    
    if (typeof serpResult.price === "number") {
      total = serpResult.price
      // Currency should come from the request parameters, use defaultCurrency
    } else if (serpResult.price && typeof serpResult.price === "object") {
      total = serpResult.price.total || serpResult.price.value || 0
      currency = serpResult.price.currency || serpResult.price.currency_code || defaultCurrency
    } else {
      // Try other price fields
      total = serpResult.total_price || serpResult.price_value || 0
    }

    if (!total || total === 0) {
      console.warn("[Normalize] Skipping offer without valid price.")
      console.warn("[Normalize] Price value:", serpResult.price)
      console.warn("[Normalize] Price type:", typeof serpResult.price)
      console.warn("[Normalize] Full result keys:", Object.keys(serpResult))
      return null // Skip offers without valid pricing
    }

    // Parse segments - in SerpApi format, segments are in serpResult.flights array
    const segmentsRaw = serpResult.flights || serpResult.segments || serpResult.route || []
    const segments: FlightSegment[] = []

    if (!Array.isArray(segmentsRaw)) {
      console.warn("[Normalize] Segments is not an array:", typeof segmentsRaw)
      console.warn("[Normalize] Segments value:", segmentsRaw)
      console.warn("[Normalize] Available keys:", Object.keys(serpResult))
      return null
    }

    if (segmentsRaw.length === 0) {
      console.warn("[Normalize] Empty segments array")
      console.warn("[Normalize] Full result structure:", JSON.stringify(serpResult, null, 2).substring(0, 1000))
      return null
    }

    for (const seg of segmentsRaw) {
      const parsed = parseSegment(seg)
      if (parsed) {
        segments.push(parsed)
      } else {
        console.warn("[Normalize] Failed to parse segment")
        console.warn("[Normalize] Segment structure:", JSON.stringify(seg, null, 2).substring(0, 500))
      }
    }

    if (segments.length === 0) {
      console.warn("[Normalize] No valid segments found after parsing")
      console.warn("[Normalize] Raw segments count:", segmentsRaw.length)
      console.warn("[Normalize] First segment sample:", JSON.stringify(segmentsRaw[0], null, 2).substring(0, 500))
      return null // Skip if no valid segments
    }

    // Extract layovers - SerpApi provides layovers array directly
    let layovers: Layover[] = []
    
    if (Array.isArray(serpResult.layovers)) {
      // Use SerpApi layovers format: { duration, name, id, overnight? }
      layovers = serpResult.layovers.map((lay: any) => ({
        airport: lay.id || lay.name || "",
        duration_minutes: lay.duration || 0,
      })).filter((lay: Layover) => lay.airport && lay.duration_minutes > 0)
    } else {
      // Fallback: extract from segments
      layovers = extractLayovers(segments)
    }

    // Calculate total duration - SerpApi provides total_duration directly
    let total_duration_minutes = serpResult.total_duration
    if (!total_duration_minutes) {
      // Sum segment durations + layover durations
      const segmentDuration = segments.reduce((sum, seg) => sum + seg.duration_minutes, 0)
      const layoverDuration = layovers.reduce((sum, lay) => sum + lay.duration_minutes, 0)
      total_duration_minutes = segmentDuration + layoverDuration
    }

    // Determine number of stops
    const num_stops = Math.max(0, segments.length - 1)

    // Parse cabin class - SerpApi provides travel_class as a string
    const classStr = serpResult.travel_class || serpResult.class || serpResult.cabin_class || "Economy"

    // Get booking link - SerpApi provides booking_token, need to construct URL or use departure_token
    const booking_link = serpResult.booking_token 
      ? `https://www.google.com/travel/flights?booking_token=${serpResult.booking_token}`
      : serpResult.book_url || serpResult.booking_link || serpResult.link || ""

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
export function normalizeFlightOffers(serpResults: any[], provider: string = "serpapi", defaultCurrency: string = "USD"): FlightOffer[] {
  const offers: FlightOffer[] = []

  console.log(`[Normalize] Normalizing ${serpResults.length} raw results`)

  for (let i = 0; i < serpResults.length; i++) {
    const result = serpResults[i]
    console.log(`[Normalize] Processing result ${i + 1}/${serpResults.length}`)
    console.log(`[Normalize] Result ${i + 1} structure:`, {
      hasFlights: !!result.flights,
      flightsLength: Array.isArray(result.flights) ? result.flights.length : 'not array',
      hasPrice: !!result.price,
      priceValue: result.price,
      keys: Object.keys(result),
    })
    
    // Log first result in detail for debugging
    if (i === 0) {
      console.log(`[Normalize] First result full structure:`, JSON.stringify(result, null, 2).substring(0, 2000))
    }
    
    const offer = normalizeFlightOffer(result, provider, defaultCurrency)
    if (offer) {
      offers.push(offer)
      console.log(`[Normalize] Successfully normalized offer ${i + 1}: ${offer.segments.length} segments, price: ${offer.price.total} ${offer.price.currency}`)
    } else {
      console.warn(`[Normalize] Failed to normalize result ${i + 1}`)
      console.warn(`[Normalize] Result keys:`, Object.keys(result))
      console.warn(`[Normalize] Result.flights:`, result.flights)
      console.warn(`[Normalize] Result.price:`, result.price)
    }
  }

  console.log(`[Normalize] Successfully normalized ${offers.length} out of ${serpResults.length} results`)
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


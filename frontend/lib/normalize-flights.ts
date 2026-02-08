/**
 * Normalization Layer
 * 
 * Converts raw SerpApi Google Flights results into the unified FlightOffer schema.
 * This layer makes it easy to swap out SerpApi for Duffel/Amadeus later.
 */

import type { FlightOffer, FlightSegment, Layover, AirportInfo, SerpApiFlightResult, FlightDetailsData, SegmentData, LayoverData } from "./types"
import { extractDealUrl } from "./provider-deep-link"

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
    let airlineLogo = ""
    
    if (typeof segment.airline === "string") {
      airlineName = segment.airline
    } else if (segment.airline && typeof segment.airline === "object") {
      airlineCode = segment.airline.code || ""
      airlineName = segment.airline.name || "Unknown"
      airlineLogo = segment.airline.logo || segment.airline_logo || ""
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
        logo: airlineLogo,
      },
      flight_number: segment.flight_number || segment.number || "",
      duration_minutes: duration_minutes || 0,
      aircraft: segment.airplane || segment.aircraft || segment.plane || undefined,
      // Extended data
      travel_class: segment.travel_class || undefined,
      legroom: segment.legroom || undefined,
      extensions: segment.extensions || undefined,
      often_delayed_by_over_30_min: segment.often_delayed_by_over_30_min || false,
      overnight: segment.overnight || false,
      departure_terminal: departureAirport.terminal || undefined,
      arrival_terminal: arrivalAirport.terminal || undefined,
    }
  } catch (error) {
    console.error("[Normalize] Error parsing segment:", error, "Segment:", segment)
    return null
  }
}

/**
 * Convert FlightSegment to SegmentData for storage
 */
function segmentToSegmentData(segment: FlightSegment, index: number): SegmentData {
  return {
    segment_number: index + 1,
    airline: segment.airline.name,
    airline_code: segment.airline.code,
    airline_logo: (segment.airline as any).logo || undefined,
    flight_number: segment.flight_number,
    aircraft: segment.aircraft,
    departure_airport: segment.from.code,
    departure_airport_name: segment.from.city ? `${segment.from.city}, ${segment.from.country}` : undefined,
    departure_terminal: (segment as any).departure_terminal,
    departure_time: segment.departure,
    arrival_airport: segment.to.code,
    arrival_airport_name: segment.to.city ? `${segment.to.city}, ${segment.to.country}` : undefined,
    arrival_terminal: (segment as any).arrival_terminal,
    arrival_time: segment.arrival,
    duration_minutes: segment.duration_minutes,
    cabin_class: (segment as any).travel_class,
    overnight: (segment as any).overnight,
    often_delayed: (segment as any).often_delayed_by_over_30_min,
    legroom: (segment as any).legroom,
    extensions: (segment as any).extensions,
  }
}

/**
 * Convert Layover to LayoverData for storage
 */
function layoverToLayoverData(layover: Layover, serpLayover?: any): LayoverData {
  return {
    airport: layover.airport,
    airport_name: serpLayover?.name || undefined,
    duration_minutes: layover.duration_minutes,
    overnight: serpLayover?.overnight || false,
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
 * Search context for normalization - contains dates from the original search
 */
export interface SearchContext {
  outbound_date?: string
  return_date?: string
}

/**
 * Normalize a single SerpApi flight result to FlightOffer
 * @param serpResult - Raw SerpAPI result
 * @param provider - Provider name
 * @param defaultCurrency - Default currency code
 * @param searchContext - Optional search context with the actual search dates (for proper URL generation)
 */
export function normalizeFlightOffer(serpResult: any, provider: string = "serpapi", defaultCurrency: string = "USD", searchContext?: SearchContext): FlightOffer | null {
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

    // Extract origin, destination, and dates from segments FIRST (needed for booking_link construction)
    const firstSegment = segments[0]
    const lastSegment = segments[segments.length - 1]
    const origin = firstSegment?.from?.code || ""
    const destination = lastSegment?.to?.code || ""
    
    // Extract outbound date from first segment departure
    const outboundDate = firstSegment?.departure 
      ? new Date(firstSegment.departure).toISOString().split("T")[0]
      : ""
    
    // IMPORTANT: Use the search context return_date (actual trip return date) instead of 
    // lastSegment?.arrival (which is just the arrival time of the outbound flight)
    // This ensures Google Flights URLs have the correct return date for round-trip searches
    const returnDate = searchContext?.return_date || ""

    // Get booking link - SerpApi provides booking_token, need to construct URL or use departure_token
    // Check for booking_token first (most reliable for Google Flights)
    const booking_token = serpResult.booking_token || serpResult.departure_token
    let booking_link = ""
    
    if (booking_token) {
      // Construct Google Flights URL with search parameters for better pre-filling
      // Note: booking_token is internal to Google Flights and may not work as a URL param
      // So we construct a proper search URL that will pre-fill the form
      if (origin && destination && outboundDate) {
        // Build the search query in Google Flights format
        const searchQuery = returnDate
          ? `Flights%20from%20${encodeURIComponent(origin)}%20to%20${encodeURIComponent(destination)}%20on%20${outboundDate}%20returning%20${returnDate}`
          : `Flights%20from%20${encodeURIComponent(origin)}%20to%20${encodeURIComponent(destination)}%20on%20${outboundDate}`
        
        booking_link = `https://www.google.com/travel/flights?q=${searchQuery}`
      } else {
        // Fallback: basic Google Flights URL
        booking_link = `https://www.google.com/travel/flights`
      }
    } else {
      booking_link = serpResult.book_url || serpResult.booking_link || serpResult.link || ""
    }

    // Extract deal_url and provider from SerpAPI result
    // Build flight input from segments for fallback URL generation

    // Extract deal_url using the provider deep-link utility
    const flightInput = origin && destination && outboundDate ? {
      origin,
      destination,
      outboundDate,
      returnDate: returnDate || undefined,
      adults: 1, // Default, could be extracted from search params if available
    } : undefined

    const { url: deal_url, provider: extractedProvider } = extractDealUrl(serpResult, flightInput)
    
    // Use extracted provider if available, otherwise use the passed provider
    const finalProvider = extractedProvider && extractedProvider !== "Unknown" ? extractedProvider : provider

    // Use deal_url if available, otherwise fallback to booking_link
    const finalDealUrl = deal_url || booking_link || null

    // Log if no deal_url could be generated (but we still have booking_link)
    if (!deal_url && !booking_link) {
      console.warn(`[Normalize] No deal_url or booking_link available for provider: ${finalProvider}`)
    } else if (!deal_url && booking_link) {
      console.log(`[Normalize] Using booking_link as deal_url for provider: ${finalProvider}`)
    }

    // Extract notes
    const notes: string[] = []
    if (serpResult.warnings) {
      notes.push(...serpResult.warnings)
    }
    if (serpResult.bags && !serpResult.bags.included) {
      notes.push("Bags not included")
    }

    // Generate unique ID - include departure and arrival times to ensure uniqueness
    const departureDateTime = firstSegment?.departure 
      ? new Date(firstSegment.departure).toISOString().replace(/[:.]/g, "-").substring(0, 19) // YYYY-MM-DDTHH-MM-SS
      : "unknown"
    const arrivalDateTime = lastSegment?.arrival
      ? new Date(lastSegment.arrival).toISOString().replace(/[:.]/g, "-").substring(0, 19)
      : "unknown"
    const routeStr = segments.map((s) => `${s.from.code}-${s.to.code}-${s.flight_number}`).join("_")
    // Create a hash-like string from all unique components
    const uniqueStr = `${departureDateTime}_${arrivalDateTime}_${routeStr}_${total}`
    // Simple hash function for deterministic but unique IDs
    let hash = 0
    for (let i = 0; i < uniqueStr.length; i++) {
      const char = uniqueStr.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    const id = `${finalProvider}_${Math.abs(hash).toString(36)}_${departureDateTime.split("T")[0]}`

    // Build extended flight details
    const flight_details: FlightDetailsData = {
      // Outbound segments (all segments for one-way, first half for round-trip)
      outbound_segments: segments.map((seg, i) => segmentToSegmentData(seg, i)),
      outbound_departure_time: firstSegment?.departure,
      outbound_arrival_time: lastSegment?.arrival,
      outbound_duration_minutes: total_duration_minutes,
      
      // Layover details with extended info
      layover_details: layovers.map((lay, i) => 
        layoverToLayoverData(lay, serpResult.layovers?.[i])
      ),
      
      // Flight info from first segment
      aircraft_type: firstSegment?.aircraft || serpResult.airplane || undefined,
      cabin_class: classStr,
      fare_type: serpResult.fare_type || serpResult.type || undefined,
      marketing_carrier: firstSegment?.airline?.name,
      operating_carrier: serpResult.operated_by || serpResult.operating_carrier || undefined,
      flight_numbers: segments.map(s => s.flight_number).filter(Boolean),
      
      // Terminals from first and last segment
      departure_terminal: (firstSegment as any)?.departure_terminal,
      arrival_terminal: (lastSegment as any)?.arrival_terminal,
      
      // Currency
      currency: currency,
      
      // Check for overnight flight
      overnight: segments.some((s: any) => s.overnight) || serpResult.overnight || false,
      total_duration_minutes: total_duration_minutes,
    }

    // Extract carbon emissions if available
    let carbon_emissions = undefined
    if (serpResult.carbon_emissions) {
      carbon_emissions = {
        this_flight: serpResult.carbon_emissions.this_flight,
        typical_for_this_route: serpResult.carbon_emissions.typical_for_this_route,
        difference_percent: serpResult.carbon_emissions.difference_percent,
      }
    }

    return {
      id,
      provider: finalProvider,
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
      deal_url: finalDealUrl,
      notes,
      flight_details,
      carbon_emissions,
    }
  } catch (error) {
    console.error("[Normalize] Error normalizing flight offer:", error)
    return null
  }
}

/**
 * Normalize multiple SerpApi results into FlightOffers
 * Filters out invalid offers
 * @param serpResults - Array of raw SerpAPI results
 * @param provider - Provider name
 * @param defaultCurrency - Default currency code
 * @param searchContext - Optional search context with actual search dates (for proper URL generation)
 */
export function normalizeFlightOffers(serpResults: any[], provider: string = "serpapi", defaultCurrency: string = "USD", searchContext?: SearchContext): FlightOffer[] {
  const offers: FlightOffer[] = []

  console.log(`[Normalize] Normalizing ${serpResults.length} raw results`)
  if (searchContext) {
    console.log(`[Normalize] Using search context: outbound=${searchContext.outbound_date}, return=${searchContext.return_date}`)
  }

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
    
    const offer = normalizeFlightOffer(result, provider, defaultCurrency, searchContext)
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
 * Extract raw flight objects from a SerpApi response.
 * Returns the individual flight entries (not normalized) from best_flights,
 * other_flights, and flights arrays.
 */
export function extractFlightsFromSerpApiResponse(response: SerpApiFlightResult): unknown[] {
  const flights: unknown[] = []

  if (Array.isArray(response.best_flights)) {
    flights.push(...response.best_flights)
  }
  if (Array.isArray(response.other_flights)) {
    flights.push(...response.other_flights)
  }
  if (Array.isArray(response.flights)) {
    flights.push(...response.flights)
  }

  // Fallback: if response itself is an array
  if (flights.length === 0 && Array.isArray(response)) {
    flights.push(...response)
  }

  return flights
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


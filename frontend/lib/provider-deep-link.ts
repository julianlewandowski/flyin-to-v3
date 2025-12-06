/**
 * Provider Deep-Link Router
 * 
 * Generates deep-link URLs for flight providers when SerpAPI doesn't provide them.
 * This is a fallback mechanism for constructing booking URLs based on provider name.
 */

export interface FlightDealInput {
  origin: string
  destination: string
  outboundDate: string
  returnDate?: string
  adults?: number
  children?: number
  infants?: number
  currency?: string
}

/**
 * Generate a deep-link URL for a specific provider
 * 
 * @param provider - Provider name (e.g., "Turkish Airlines", "Expedia", "Google Flights")
 * @param flight - Flight deal input parameters
 * @returns Deep-link URL or null if provider is not supported
 */
export function getProviderDeepLink(provider: string, flight: FlightDealInput): string | null {
  if (!provider || !flight) {
    return null
  }

  const providerLower = provider.toLowerCase().trim()
  const { origin, destination, outboundDate, returnDate, adults = 1, children = 0, infants = 0 } = flight

  // Normalize airport codes (remove spaces, convert to uppercase)
  const normalizedOrigin = origin.trim().toUpperCase()
  const normalizedDest = destination.trim().toUpperCase()

  // Format dates (ensure YYYY-MM-DD format)
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ""
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr
    }
    // Try to parse and format
    try {
      const date = new Date(dateStr)
      return date.toISOString().split("T")[0]
    } catch {
      return dateStr
    }
  }

  const formattedOutbound = formatDate(outboundDate)
  const formattedReturn = returnDate ? formatDate(returnDate) : ""

  switch (providerLower) {
    case "turkish airlines":
    case "turkish":
      if (formattedReturn) {
        return `https://www.turkishairlines.com/en-int/flights/booking/?departure=${normalizedOrigin}&arrival=${normalizedDest}&departureDate=${formattedOutbound}&returnDate=${formattedReturn}&adult=${adults}${children > 0 ? `&child=${children}` : ""}${infants > 0 ? `&infant=${infants}` : ""}`
      } else {
        return `https://www.turkishairlines.com/en-int/flights/booking/?departure=${normalizedOrigin}&arrival=${normalizedDest}&departureDate=${formattedOutbound}&adult=${adults}${children > 0 ? `&child=${children}` : ""}${infants > 0 ? `&infant=${infants}` : ""}`
      }

    case "lufthansa":
      if (formattedReturn) {
        return `https://www.lufthansa.com/search?origin=${normalizedOrigin}&destination=${normalizedDest}&departureDate=${formattedOutbound}&returnDate=${formattedReturn}&adults=${adults}${children > 0 ? `&children=${children}` : ""}${infants > 0 ? `&infants=${infants}` : ""}`
      } else {
        return `https://www.lufthansa.com/search?origin=${normalizedOrigin}&destination=${normalizedDest}&departureDate=${formattedOutbound}&adults=${adults}${children > 0 ? `&children=${children}` : ""}${infants > 0 ? `&infants=${infants}` : ""}`
      }

    case "expedia":
      if (formattedReturn) {
        return `https://www.expedia.com/Flights-Search?trip=roundtrip&leg1=from:${normalizedOrigin},to:${normalizedDest},departure:${formattedOutbound}TANYT&leg2=from:${normalizedDest},to:${normalizedOrigin},departure:${formattedReturn}TANYT&passengers=adults:${adults}${children > 0 ? `,children:${children}` : ""}${infants > 0 ? `,infants:${infants}` : ""}`
      } else {
        return `https://www.expedia.com/Flights-Search?trip=oneway&leg1=from:${normalizedOrigin},to:${normalizedDest},departure:${formattedOutbound}TANYT&passengers=adults:${adults}${children > 0 ? `,children:${children}` : ""}${infants > 0 ? `,infants:${infants}` : ""}`
      }

    case "google flights":
    case "google":
      if (formattedReturn) {
        return `https://www.google.com/travel/flights?q=Flights%20from%20${normalizedOrigin}%20to%20${normalizedDest}%20on%20${formattedOutbound}%20returning%20${formattedReturn}`
      } else {
        return `https://www.google.com/travel/flights?q=Flights%20from%20${normalizedOrigin}%20to%20${normalizedDest}%20on%20${formattedOutbound}`
      }

    case "kayak":
      if (formattedReturn) {
        return `https://www.kayak.com/flights/${normalizedOrigin}-${normalizedDest}/${formattedOutbound}/${normalizedDest}-${normalizedOrigin}/${formattedReturn}?sort=bestflight_a`
      } else {
        return `https://www.kayak.com/flights/${normalizedOrigin}-${normalizedDest}/${formattedOutbound}?sort=bestflight_a`
      }

    case "momondo":
      if (formattedReturn) {
        return `https://www.momondo.com/flight-search/${normalizedOrigin}-${normalizedDest}/${formattedOutbound}/${normalizedDest}-${normalizedOrigin}/${formattedReturn}`
      } else {
        return `https://www.momondo.com/flight-search/${normalizedOrigin}-${normalizedDest}/${formattedOutbound}`
      }

    case "skyscanner":
      if (formattedReturn) {
        return `https://www.skyscanner.com/transport/flights/${normalizedOrigin}/${normalizedDest}/${formattedOutbound}/${normalizedDest}/${normalizedOrigin}/${formattedReturn}/`
      } else {
        return `https://www.skyscanner.com/transport/flights/${normalizedOrigin}/${normalizedDest}/${formattedOutbound}/`
      }

    case "air france":
    case "airfrance":
      if (formattedReturn) {
        return `https://www.airfrance.com/search?origin=${normalizedOrigin}&destination=${normalizedDest}&departureDate=${formattedOutbound}&returnDate=${formattedReturn}&adults=${adults}`
      } else {
        return `https://www.airfrance.com/search?origin=${normalizedOrigin}&destination=${normalizedDest}&departureDate=${formattedOutbound}&adults=${adults}`
      }

    case "klm":
      if (formattedReturn) {
        return `https://www.klm.com/search?origin=${normalizedOrigin}&destination=${normalizedDest}&departureDate=${formattedOutbound}&returnDate=${formattedReturn}&adults=${adults}`
      } else {
        return `https://www.klm.com/search?origin=${normalizedOrigin}&destination=${normalizedDest}&departureDate=${formattedOutbound}&adults=${adults}`
      }

    case "british airways":
    case "britishairways":
      if (formattedReturn) {
        return `https://www.britishairways.com/travel/home/public/en_gb/?origin=${normalizedOrigin}&destination=${normalizedDest}&departureDate=${formattedOutbound}&returnDate=${formattedReturn}&adults=${adults}`
      } else {
        return `https://www.britishairways.com/travel/home/public/en_gb/?origin=${normalizedOrigin}&destination=${normalizedDest}&departureDate=${formattedOutbound}&adults=${adults}`
      }

    default:
      // Unknown provider - return null
      return null
  }
}

/**
 * Extract the best available link from SerpAPI result
 * Priority: deep_link > link > booking_token (construct Google Flights URL) > null
 * 
 * @param serpResult - Raw SerpAPI flight result object
 * @param flightInput - Flight deal input for fallback URL generation
 * @returns Best available URL or null
 */
export function extractDealUrl(
  serpResult: any,
  flightInput?: FlightDealInput
): { url: string | null; provider: string } {
  // Extract provider/source from SerpAPI result
  const provider = 
    serpResult.source || 
    serpResult.source_name || 
    serpResult.provider || 
    serpResult.website ||
    "Unknown"

  // Priority 1: Use deep_link if available
  if (serpResult.deep_link && typeof serpResult.deep_link === "string" && serpResult.deep_link.trim()) {
    return { url: serpResult.deep_link.trim(), provider }
  }

  // Priority 2: Use link if available
  if (serpResult.link && typeof serpResult.link === "string" && serpResult.link.trim()) {
    return { url: serpResult.link.trim(), provider }
  }

  // Priority 3: Use booking_token to construct Google Flights URL with search parameters
  if (serpResult.booking_token && typeof serpResult.booking_token === "string" && serpResult.booking_token.trim()) {
    // Construct proper Google Flights URL with search parameters
    // Google Flights uses a specific URL format for pre-filled searches
    if (flightInput && flightInput.origin && flightInput.destination && flightInput.outboundDate) {
      // Build the search query in Google Flights format
      const searchQuery = flightInput.returnDate
        ? `Flights%20from%20${encodeURIComponent(flightInput.origin)}%20to%20${encodeURIComponent(flightInput.destination)}%20on%20${flightInput.outboundDate}%20returning%20${flightInput.returnDate}`
        : `Flights%20from%20${encodeURIComponent(flightInput.origin)}%20to%20${encodeURIComponent(flightInput.destination)}%20on%20${flightInput.outboundDate}`
      
      // Use the standard Google Flights search URL format (booking_token may not work as a param, but search will)
      const googleFlightsUrl = `https://www.google.com/travel/flights?q=${searchQuery}`
      return { url: googleFlightsUrl, provider: "Google Flights" }
    } else {
      // Fallback: construct basic search URL
      const googleFlightsUrl = `https://www.google.com/travel/flights`
      return { url: googleFlightsUrl, provider: "Google Flights" }
    }
  }

  // Also check for departure_token (alternative field name)
  if (serpResult.departure_token && typeof serpResult.departure_token === "string" && serpResult.departure_token.trim()) {
    if (flightInput && flightInput.origin && flightInput.destination && flightInput.outboundDate) {
      const searchQuery = flightInput.returnDate
        ? `Flights%20from%20${encodeURIComponent(flightInput.origin)}%20to%20${encodeURIComponent(flightInput.destination)}%20on%20${flightInput.outboundDate}%20returning%20${flightInput.returnDate}`
        : `Flights%20from%20${encodeURIComponent(flightInput.origin)}%20to%20${encodeURIComponent(flightInput.destination)}%20on%20${flightInput.outboundDate}`
      
      const googleFlightsUrl = `https://www.google.com/travel/flights?q=${searchQuery}`
      return { url: googleFlightsUrl, provider: "Google Flights" }
    } else {
      const googleFlightsUrl = `https://www.google.com/travel/flights`
      return { url: googleFlightsUrl, provider: "Google Flights" }
    }
  }

  // Priority 4: Use book_url if available
  if (serpResult.book_url && typeof serpResult.book_url === "string" && serpResult.book_url.trim()) {
    return { url: serpResult.book_url.trim(), provider }
  }

  // Priority 5: Use booking_link if available
  if (serpResult.booking_link && typeof serpResult.booking_link === "string" && serpResult.booking_link.trim()) {
    return { url: serpResult.booking_link.trim(), provider }
  }

  // Fallback: Try to generate URL from provider name
  if (flightInput && provider && provider !== "Unknown") {
    const generatedUrl = getProviderDeepLink(provider, flightInput)
    if (generatedUrl) {
      return { url: generatedUrl, provider }
    }
  }

  // No link available
  return { url: null, provider }
}


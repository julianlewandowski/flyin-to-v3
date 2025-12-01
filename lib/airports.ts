// Comprehensive airport database with IATA codes, names, cities, and countries
// This includes major airports worldwide with support for city-level searches

export interface Airport {
  iata: string
  name: string
  city: string
  country: string
  // For city-level searches (all airports in a city)
  isCity?: boolean
}

// Major airports worldwide - comprehensive list
export const airports: Airport[] = [
  // London airports
  { iata: "LHR", name: "London Heathrow Airport", city: "London", country: "United Kingdom" },
  { iata: "LGW", name: "London Gatwick Airport", city: "London", country: "United Kingdom" },
  { iata: "STN", name: "London Stansted Airport", city: "London", country: "United Kingdom" },
  { iata: "LTN", name: "London Luton Airport", city: "London", country: "United Kingdom" },
  { iata: "SEN", name: "London Southend Airport", city: "London", country: "United Kingdom" },
  { iata: "LCY", name: "London City Airport", city: "London", country: "United Kingdom" },

  // New York airports
  { iata: "JFK", name: "John F. Kennedy International Airport", city: "New York", country: "United States" },
  { iata: "LGA", name: "LaGuardia Airport", city: "New York", country: "United States" },
  { iata: "EWR", name: "Newark Liberty International Airport", city: "New York", country: "United States" },

  // Paris airports
  { iata: "CDG", name: "Charles de Gaulle Airport", city: "Paris", country: "France" },
  { iata: "ORY", name: "Paris Orly Airport", city: "Paris", country: "France" },
  { iata: "BVA", name: "Paris Beauvais Airport", city: "Paris", country: "France" },

  // Los Angeles airports
  { iata: "LAX", name: "Los Angeles International Airport", city: "Los Angeles", country: "United States" },
  { iata: "BUR", name: "Bob Hope Airport", city: "Burbank", country: "United States" },
  { iata: "ONT", name: "Ontario International Airport", city: "Ontario", country: "United States" },
  { iata: "SNA", name: "John Wayne Airport", city: "Santa Ana", country: "United States" },

  // Tokyo airports
  { iata: "NRT", name: "Narita International Airport", city: "Tokyo", country: "Japan" },
  { iata: "HND", name: "Haneda Airport", city: "Tokyo", country: "Japan" },

  // Dubai
  { iata: "DXB", name: "Dubai International Airport", city: "Dubai", country: "United Arab Emirates" },
  { iata: "DWC", name: "Al Maktoum International Airport", city: "Dubai", country: "United Arab Emirates" },

  // Singapore
  { iata: "SIN", name: "Singapore Changi Airport", city: "Singapore", country: "Singapore" },

  // Amsterdam
  { iata: "AMS", name: "Amsterdam Schiphol Airport", city: "Amsterdam", country: "Netherlands" },

  // Frankfurt
  { iata: "FRA", name: "Frankfurt Airport", city: "Frankfurt", country: "Germany" },

  // Madrid
  { iata: "MAD", name: "Madrid-Barajas Airport", city: "Madrid", country: "Spain" },

  // Barcelona
  { iata: "BCN", name: "Barcelona-El Prat Airport", city: "Barcelona", country: "Spain" },

  // Rome
  { iata: "FCO", name: "Leonardo da Vinci-Fiumicino Airport", city: "Rome", country: "Italy" },
  { iata: "CIA", name: "Ciampino Airport", city: "Rome", country: "Italy" },

  // Istanbul
  { iata: "IST", name: "Istanbul Airport", city: "Istanbul", country: "Turkey" },
  { iata: "SAW", name: "Sabiha Gökçen International Airport", city: "Istanbul", country: "Turkey" },

  // Sydney
  { iata: "SYD", name: "Sydney Kingsford Smith Airport", city: "Sydney", country: "Australia" },

  // Melbourne
  { iata: "MEL", name: "Melbourne Airport", city: "Melbourne", country: "Australia" },

  // Toronto
  { iata: "YYZ", name: "Toronto Pearson International Airport", city: "Toronto", country: "Canada" },
  { iata: "YTZ", name: "Billy Bishop Toronto City Airport", city: "Toronto", country: "Canada" },

  // Vancouver
  { iata: "YVR", name: "Vancouver International Airport", city: "Vancouver", country: "Canada" },

  // Chicago
  { iata: "ORD", name: "O'Hare International Airport", city: "Chicago", country: "United States" },
  { iata: "MDW", name: "Midway International Airport", city: "Chicago", country: "United States" },

  // Miami
  { iata: "MIA", name: "Miami International Airport", city: "Miami", country: "United States" },
  { iata: "FLL", name: "Fort Lauderdale-Hollywood International Airport", city: "Fort Lauderdale", country: "United States" },

  // San Francisco
  { iata: "SFO", name: "San Francisco International Airport", city: "San Francisco", country: "United States" },
  { iata: "OAK", name: "Oakland International Airport", city: "Oakland", country: "United States" },
  { iata: "SJC", name: "San Jose International Airport", city: "San Jose", country: "United States" },

  // Seattle
  { iata: "SEA", name: "Seattle-Tacoma International Airport", city: "Seattle", country: "United States" },

  // Boston
  { iata: "BOS", name: "Logan International Airport", city: "Boston", country: "United States" },

  // Washington DC
  { iata: "DCA", name: "Ronald Reagan Washington National Airport", city: "Washington", country: "United States" },
  { iata: "IAD", name: "Washington Dulles International Airport", city: "Washington", country: "United States" },
  { iata: "BWI", name: "Baltimore/Washington International Airport", city: "Baltimore", country: "United States" },

  // Dallas
  { iata: "DFW", name: "Dallas/Fort Worth International Airport", city: "Dallas", country: "United States" },
  { iata: "DAL", name: "Dallas Love Field", city: "Dallas", country: "United States" },

  // Atlanta
  { iata: "ATL", name: "Hartsfield-Jackson Atlanta International Airport", city: "Atlanta", country: "United States" },

  // Las Vegas
  { iata: "LAS", name: "McCarran International Airport", city: "Las Vegas", country: "United States" },

  // Phoenix
  { iata: "PHX", name: "Phoenix Sky Harbor International Airport", city: "Phoenix", country: "United States" },

  // Denver
  { iata: "DEN", name: "Denver International Airport", city: "Denver", country: "United States" },

  // Houston
  { iata: "IAH", name: "George Bush Intercontinental Airport", city: "Houston", country: "United States" },
  { iata: "HOU", name: "William P. Hobby Airport", city: "Houston", country: "United States" },

  // Munich
  { iata: "MUC", name: "Munich Airport", city: "Munich", country: "Germany" },

  // Berlin
  { iata: "BER", name: "Berlin Brandenburg Airport", city: "Berlin", country: "Germany" },
  { iata: "TXL", name: "Berlin Tegel Airport", city: "Berlin", country: "Germany" },

  // Vienna
  { iata: "VIE", name: "Vienna International Airport", city: "Vienna", country: "Austria" },

  // Zurich
  { iata: "ZRH", name: "Zurich Airport", city: "Zurich", country: "Switzerland" },

  // Brussels
  { iata: "BRU", name: "Brussels Airport", city: "Brussels", country: "Belgium" },

  // Copenhagen
  { iata: "CPH", name: "Copenhagen Airport", city: "Copenhagen", country: "Denmark" },

  // Stockholm
  { iata: "ARN", name: "Stockholm Arlanda Airport", city: "Stockholm", country: "Sweden" },

  // Oslo
  { iata: "OSL", name: "Oslo Gardermoen Airport", city: "Oslo", country: "Norway" },

  // Helsinki
  { iata: "HEL", name: "Helsinki-Vantaa Airport", city: "Helsinki", country: "Finland" },

  // Dublin
  { iata: "DUB", name: "Dublin Airport", city: "Dublin", country: "Ireland" },

  // Lisbon
  { iata: "LIS", name: "Lisbon Portela Airport", city: "Lisbon", country: "Portugal" },

  // Porto
  { iata: "OPO", name: "Francisco Sá Carneiro Airport", city: "Porto", country: "Portugal" },

  // Athens
  { iata: "ATH", name: "Athens International Airport", city: "Athens", country: "Greece" },

  // Milan
  { iata: "MXP", name: "Malpensa Airport", city: "Milan", country: "Italy" },
  { iata: "LIN", name: "Linate Airport", city: "Milan", country: "Italy" },

  // Venice
  { iata: "VCE", name: "Venice Marco Polo Airport", city: "Venice", country: "Italy" },

  // Naples
  { iata: "NAP", name: "Naples International Airport", city: "Naples", country: "Italy" },

  // Prague
  { iata: "PRG", name: "Václav Havel Airport Prague", city: "Prague", country: "Czech Republic" },

  // Budapest
  { iata: "BUD", name: "Budapest Ferenc Liszt International Airport", city: "Budapest", country: "Hungary" },

  // Warsaw
  { iata: "WAW", name: "Warsaw Chopin Airport", city: "Warsaw", country: "Poland" },

  // Moscow
  { iata: "SVO", name: "Sheremetyevo International Airport", city: "Moscow", country: "Russia" },
  { iata: "DME", name: "Domodedovo International Airport", city: "Moscow", country: "Russia" },

  // Beijing
  { iata: "PEK", name: "Beijing Capital International Airport", city: "Beijing", country: "China" },
  { iata: "PKX", name: "Beijing Daxing International Airport", city: "Beijing", country: "China" },

  // Shanghai
  { iata: "PVG", name: "Shanghai Pudong International Airport", city: "Shanghai", country: "China" },
  { iata: "SHA", name: "Shanghai Hongqiao International Airport", city: "Shanghai", country: "China" },

  // Hong Kong
  { iata: "HKG", name: "Hong Kong International Airport", city: "Hong Kong", country: "Hong Kong" },

  // Bangkok
  { iata: "BKK", name: "Suvarnabhumi Airport", city: "Bangkok", country: "Thailand" },
  { iata: "DMK", name: "Don Mueang International Airport", city: "Bangkok", country: "Thailand" },

  // Kuala Lumpur
  { iata: "KUL", name: "Kuala Lumpur International Airport", city: "Kuala Lumpur", country: "Malaysia" },

  // Jakarta
  { iata: "CGK", name: "Soekarno-Hatta International Airport", city: "Jakarta", country: "Indonesia" },

  // Manila
  { iata: "MNL", name: "Ninoy Aquino International Airport", city: "Manila", country: "Philippines" },

  // Seoul
  { iata: "ICN", name: "Incheon International Airport", city: "Seoul", country: "South Korea" },
  { iata: "GMP", name: "Gimpo International Airport", city: "Seoul", country: "South Korea" },

  // Mumbai
  { iata: "BOM", name: "Chhatrapati Shivaji Maharaj International Airport", city: "Mumbai", country: "India" },

  // Delhi
  { iata: "DEL", name: "Indira Gandhi International Airport", city: "Delhi", country: "India" },

  // Bangalore
  { iata: "BLR", name: "Kempegowda International Airport", city: "Bangalore", country: "India" },

  // Cairo
  { iata: "CAI", name: "Cairo International Airport", city: "Cairo", country: "Egypt" },

  // Johannesburg
  { iata: "JNB", name: "O.R. Tambo International Airport", city: "Johannesburg", country: "South Africa" },

  // Cape Town
  { iata: "CPT", name: "Cape Town International Airport", city: "Cape Town", country: "South Africa" },

  // São Paulo
  { iata: "GRU", name: "São Paulo-Guarulhos International Airport", city: "São Paulo", country: "Brazil" },
  { iata: "CGH", name: "Congonhas Airport", city: "São Paulo", country: "Brazil" },

  // Rio de Janeiro
  { iata: "GIG", name: "Rio de Janeiro-Galeão International Airport", city: "Rio de Janeiro", country: "Brazil" },

  // Buenos Aires
  { iata: "EZE", name: "Ministro Pistarini International Airport", city: "Buenos Aires", country: "Argentina" },
  { iata: "AEP", name: "Jorge Newbery Airfield", city: "Buenos Aires", country: "Argentina" },

  // Mexico City
  { iata: "MEX", name: "Benito Juárez International Airport", city: "Mexico City", country: "Mexico" },

  // Cancun
  { iata: "CUN", name: "Cancún International Airport", city: "Cancún", country: "Mexico" },

  // More US airports
  { iata: "PHL", name: "Philadelphia International Airport", city: "Philadelphia", country: "United States" },
  { iata: "PIT", name: "Pittsburgh International Airport", city: "Pittsburgh", country: "United States" },
  { iata: "CLE", name: "Cleveland Hopkins International Airport", city: "Cleveland", country: "United States" },
  { iata: "DTW", name: "Detroit Metropolitan Airport", city: "Detroit", country: "United States" },
  { iata: "MSP", name: "Minneapolis-Saint Paul International Airport", city: "Minneapolis", country: "United States" },
  { iata: "MCI", name: "Kansas City International Airport", city: "Kansas City", country: "United States" },
  { iata: "STL", name: "St. Louis Lambert International Airport", city: "St. Louis", country: "United States" },
  { iata: "MSY", name: "Louis Armstrong New Orleans International Airport", city: "New Orleans", country: "United States" },
  { iata: "TPA", name: "Tampa International Airport", city: "Tampa", country: "United States" },
  { iata: "MCO", name: "Orlando International Airport", city: "Orlando", country: "United States" },
  { iata: "CLT", name: "Charlotte Douglas International Airport", city: "Charlotte", country: "United States" },
  { iata: "RDU", name: "Raleigh-Durham International Airport", city: "Raleigh", country: "United States" },
  { iata: "PDX", name: "Portland International Airport", city: "Portland", country: "United States" },
  { iata: "SLC", name: "Salt Lake City International Airport", city: "Salt Lake City", country: "United States" },
  { iata: "AUS", name: "Austin-Bergstrom International Airport", city: "Austin", country: "United States" },
  { iata: "SAN", name: "San Diego International Airport", city: "San Diego", country: "United States" },
]

// Search function to find airports by query
export function searchAirports(query: string): Airport[] {
  if (!query || query.trim().length === 0) {
    return []
  }

  const lowerQuery = query.toLowerCase().trim()

  // First, try to find exact IATA code match
  const exactIataMatch = airports.find((airport) => airport.iata.toLowerCase() === lowerQuery)
  if (exactIataMatch) {
    return [exactIataMatch]
  }

  // Then search by name, city, country, or IATA code
  const results = airports.filter((airport) => {
    const searchableText = `${airport.iata} ${airport.name} ${airport.city} ${airport.country}`.toLowerCase()
    return searchableText.includes(lowerQuery)
  })

  // Sort results: city-level options first, then by relevance
  return results.sort((a, b) => {
    // City-level options first
    if (a.isCity && !b.isCity) return -1
    if (!a.isCity && b.isCity) return 1

    // Then by how early the match appears (earlier = more relevant)
    const aIndex = `${a.iata} ${a.name} ${a.city}`.toLowerCase().indexOf(lowerQuery)
    const bIndex = `${b.iata} ${b.name} ${b.city}`.toLowerCase().indexOf(lowerQuery)

    if (aIndex !== bIndex) {
      return aIndex - bIndex
    }

    // Finally, prefer shorter names (more specific)
    return a.name.length - b.name.length
  })
}

// Get airport by IATA code
export function getAirportByIata(iata: string): Airport | undefined {
  return airports.find((airport) => airport.iata.toLowerCase() === iata.toLowerCase())
}

// Format airport for display
export function formatAirport(airport: Airport): string {
  if (airport.isCity) {
    return `${airport.name}`
  }
  return `${airport.name} (${airport.iata})`
}

// Format airport for display with city
export function formatAirportWithCity(airport: Airport): string {
  if (airport.isCity) {
    return `${airport.name}, ${airport.country}`
  }
  return `${airport.name} (${airport.iata}), ${airport.city}, ${airport.country}`
}

// Expand city-level airport code to individual airports
// NOTE: City-level airports have been removed - this function now just returns the code as-is
export function expandCityAirport(iata: string): string[] {
  // City-level airports removed - just return the code as-is
  return [iata]
}


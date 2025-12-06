/**
 * Tests for Provider Deep-Link Router
 * 
 * These tests validate:
 * 1. Flights with deep_link provided
 * 2. Flights with only link provided
 * 3. Flights requiring provider-template fallback
 * 4. Flights with unknown provider (no link)
 */

import { getProviderDeepLink, extractDealUrl } from "../provider-deep-link"

describe("Provider Deep-Link Router", () => {
  describe("getProviderDeepLink", () => {
    const baseFlightInput = {
      origin: "JFK",
      destination: "IST",
      outboundDate: "2025-07-15",
      returnDate: "2025-07-22",
      adults: 1,
    }

    it("should generate URL for Turkish Airlines", () => {
      const url = getProviderDeepLink("Turkish Airlines", baseFlightInput)
      expect(url).toContain("turkishairlines.com")
      expect(url).toContain("JFK")
      expect(url).toContain("IST")
      expect(url).toContain("2025-07-15")
      expect(url).toContain("2025-07-22")
    })

    it("should generate URL for Lufthansa", () => {
      const url = getProviderDeepLink("Lufthansa", baseFlightInput)
      expect(url).toContain("lufthansa.com")
      expect(url).toContain("JFK")
      expect(url).toContain("IST")
    })

    it("should generate URL for Expedia", () => {
      const url = getProviderDeepLink("Expedia", baseFlightInput)
      expect(url).toContain("expedia.com")
      expect(url).toContain("JFK")
      expect(url).toContain("IST")
    })

    it("should generate URL for Google Flights", () => {
      const url = getProviderDeepLink("Google Flights", baseFlightInput)
      expect(url).toContain("google.com/travel/flights")
      expect(url).toContain("JFK")
      expect(url).toContain("IST")
    })

    it("should generate URL for Kayak", () => {
      const url = getProviderDeepLink("Kayak", baseFlightInput)
      expect(url).toContain("kayak.com")
      expect(url).toContain("JFK")
      expect(url).toContain("IST")
    })

    it("should handle one-way flights", () => {
      const oneWayInput = {
        ...baseFlightInput,
        returnDate: undefined,
      }
      const url = getProviderDeepLink("Expedia", oneWayInput)
      expect(url).toContain("trip=oneway")
      expect(url).not.toContain("leg2")
    })

    it("should handle multiple passengers", () => {
      const multiPassengerInput = {
        ...baseFlightInput,
        adults: 2,
        children: 1,
        infants: 1,
      }
      const url = getProviderDeepLink("Turkish Airlines", multiPassengerInput)
      expect(url).toContain("adult=2")
      expect(url).toContain("child=1")
      expect(url).toContain("infant=1")
    })

    it("should return null for unknown provider", () => {
      const url = getProviderDeepLink("Unknown Airline", baseFlightInput)
      expect(url).toBeNull()
    })

    it("should handle case-insensitive provider names", () => {
      const url1 = getProviderDeepLink("TURKISH AIRLINES", baseFlightInput)
      const url2 = getProviderDeepLink("turkish airlines", baseFlightInput)
      const url3 = getProviderDeepLink("Turkish Airlines", baseFlightInput)
      expect(url1).toBeTruthy()
      expect(url2).toBeTruthy()
      expect(url3).toBeTruthy()
      expect(url1).toBe(url2)
      expect(url2).toBe(url3)
    })
  })

  describe("extractDealUrl", () => {
    const baseFlightInput = {
      origin: "JFK",
      destination: "IST",
      outboundDate: "2025-07-15",
      returnDate: "2025-07-22",
      adults: 1,
    }

    it("should extract deep_link when provided", () => {
      const serpResult = {
        deep_link: "https://www.turkishairlines.com/book?token=abc123",
        source: "Turkish Airlines",
      }
      const { url, provider } = extractDealUrl(serpResult, baseFlightInput)
      expect(url).toBe("https://www.turkishairlines.com/book?token=abc123")
      expect(provider).toBe("Turkish Airlines")
    })

    it("should extract link when deep_link is not available", () => {
      const serpResult = {
        link: "https://www.expedia.com/flights?deal=xyz",
        source: "Expedia",
      }
      const { url, provider } = extractDealUrl(serpResult, baseFlightInput)
      expect(url).toBe("https://www.expedia.com/flights?deal=xyz")
      expect(provider).toBe("Expedia")
    })

    it("should construct Google Flights URL from booking_token", () => {
      const serpResult = {
        booking_token: "abc123xyz",
        source: "Google Flights",
      }
      const { url, provider } = extractDealUrl(serpResult, baseFlightInput)
      expect(url).toBe("https://www.google.com/travel/flights?booking_token=abc123xyz")
      expect(provider).toBe("Google Flights")
    })

    it("should fallback to provider template when no direct link available", () => {
      const serpResult = {
        source: "Turkish Airlines",
        // No deep_link, link, or booking_token
      }
      const { url, provider } = extractDealUrl(serpResult, baseFlightInput)
      expect(url).toContain("turkishairlines.com")
      expect(url).toContain("JFK")
      expect(url).toContain("IST")
      expect(provider).toBe("Turkish Airlines")
    })

    it("should return null for unknown provider with no links", () => {
      const serpResult = {
        source: "Unknown Provider",
        // No links available
      }
      const { url, provider } = extractDealUrl(serpResult, baseFlightInput)
      expect(url).toBeNull()
      expect(provider).toBe("Unknown Provider")
    })

    it("should prioritize deep_link over link", () => {
      const serpResult = {
        deep_link: "https://preferred-link.com",
        link: "https://fallback-link.com",
        source: "Test Provider",
      }
      const { url } = extractDealUrl(serpResult, baseFlightInput)
      expect(url).toBe("https://preferred-link.com")
    })

    it("should prioritize link over booking_token", () => {
      const serpResult = {
        link: "https://direct-link.com",
        booking_token: "token123",
        source: "Test Provider",
      }
      const { url } = extractDealUrl(serpResult, baseFlightInput)
      expect(url).toBe("https://direct-link.com")
    })

    it("should extract provider from various source fields", () => {
      const testCases = [
        { source: "Turkish Airlines", expected: "Turkish Airlines" },
        { source_name: "Expedia", expected: "Expedia" },
        { provider: "Lufthansa", expected: "Lufthansa" },
        { website: "kayak.com", expected: "kayak.com" },
        { source: null, expected: "Unknown" },
      ]

      testCases.forEach(({ expected, ...serpResult }) => {
        const { provider } = extractDealUrl(serpResult, baseFlightInput)
        expect(provider).toBe(expected)
      })
    })

    it("should handle missing flight input gracefully", () => {
      const serpResult = {
        source: "Turkish Airlines",
        // No links
      }
      const { url } = extractDealUrl(serpResult, undefined)
      // Should return null since we can't generate URL without flight input
      expect(url).toBeNull()
    })
  })
})

// Simple test runner for manual execution
if (require.main === module) {
  console.log("Running provider deep-link tests...")
  
  // Test 1: Provider URL generation
  const testFlight = {
    origin: "JFK",
    destination: "IST",
    outboundDate: "2025-07-15",
    returnDate: "2025-07-22",
    adults: 1,
  }
  
  const turkishUrl = getProviderDeepLink("Turkish Airlines", testFlight)
  console.log("✓ Turkish Airlines URL:", turkishUrl ? "Generated" : "Failed")
  
  // Test 2: Link extraction with deep_link
  const serpResult1 = {
    deep_link: "https://example.com/deep",
    source: "Test Provider",
  }
  const result1 = extractDealUrl(serpResult1, testFlight)
  console.log("✓ Deep link extraction:", result1.url === serpResult1.deep_link ? "Pass" : "Fail")
  
  // Test 3: Fallback to provider template
  const serpResult2 = {
    source: "Turkish Airlines",
  }
  const result2 = extractDealUrl(serpResult2, testFlight)
  console.log("✓ Provider template fallback:", result2.url ? "Pass" : "Fail")
  
  // Test 4: Unknown provider
  const serpResult3 = {
    source: "Unknown Airline",
  }
  const result3 = extractDealUrl(serpResult3, testFlight)
  console.log("✓ Unknown provider handling:", result3.url === null ? "Pass" : "Fail")
  
  console.log("\nAll tests completed!")
}


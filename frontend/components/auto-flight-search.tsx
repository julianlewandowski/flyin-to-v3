"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

interface AutoFlightSearchProps {
  holidayId: string
  hasFlights: boolean
  lastSearchDate?: string | null
  autoSearchEnabled?: boolean
}

/**
 * Automatically triggers a flight search when the page loads
 * if there are no flights or if the last search is older than 24 hours
 */
export default function AutoFlightSearch({
  holidayId,
  hasFlights,
  lastSearchDate,
  autoSearchEnabled = true,
}: AutoFlightSearchProps) {
  const router = useRouter()
  const hasSearched = useRef(false)
  const [isMounted, setIsMounted] = useState(false)

  // Only run on client side after mount
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    // Only run once per page load and after component is mounted
    if (hasSearched.current || !autoSearchEnabled || !isMounted) {
      return
    }

    // Check if we should auto-search
    const shouldSearch = (() => {
      // If no flights, always search
      if (!hasFlights) {
        return true
      }

      // If flights exist, check if they're stale (older than 24 hours)
      if (lastSearchDate) {
        const lastSearch = new Date(lastSearchDate)
        const now = new Date()
        const hoursSinceLastSearch = (now.getTime() - lastSearch.getTime()) / (1000 * 60 * 60)
        
        // Search if last search was more than 24 hours ago
        if (hoursSinceLastSearch > 24) {
          return true
        }
      }

      return false
    })()

    if (shouldSearch) {
      hasSearched.current = true
      
      console.log("[Auto Flight Search] Auto-triggering search for holiday:", holidayId)
      
      // Add a delay to ensure page is fully loaded and not suspended
      const timeoutId = setTimeout(() => {
        // Check if we're still mounted before making the request
        if (typeof window === "undefined") {
          return
        }

        // Use AbortController to handle cancellation
        const controller = new AbortController()
        const timeoutId2 = setTimeout(() => controller.abort(), 30000) // 30 second timeout

        // Trigger the search
        fetch(`/api/holidays/${holidayId}/search-flights-unified`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        })
          .then(async (res) => {
            clearTimeout(timeoutId2)
            if (!res.ok) {
              throw new Error(`Search failed with status ${res.status}`)
            }
            const data = await res.json()
            
            if (data.success) {
              console.log("[Auto Flight Search] Search completed successfully")
              // Refresh the page after a delay to show new flights
              setTimeout(() => {
                if (typeof window !== "undefined") {
                  router.refresh()
                  // Also do a hard refresh to ensure results show
                  setTimeout(() => {
                    if (typeof window !== "undefined") {
                      window.location.reload()
                    }
                  }, 2000)
                }
              }, 3000)
            } else {
              console.warn("[Auto Flight Search] Search completed with warnings:", data.message || data.error)
            }
          })
          .catch((err) => {
            clearTimeout(timeoutId2)
            // Only log if it's not an abort error
            if (err.name !== "AbortError") {
              console.error("[Auto Flight Search] Error during auto-search:", err)
            }
            // Don't break the page, just log the error
          })
      }, 2000) // Wait 2 seconds after mount before searching

      // Cleanup timeout on unmount
      return () => {
        clearTimeout(timeoutId)
      }
    }
  }, [holidayId, hasFlights, lastSearchDate, autoSearchEnabled, router, isMounted])

  // This component doesn't render anything
  return null
}


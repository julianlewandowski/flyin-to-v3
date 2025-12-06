"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface FlightResultsPollerProps {
  holidayId: string
  initialFlightCount: number
  searchJustCompleted?: boolean
}

/**
 * Polls for new flights after a search completes
 * Refreshes the page when flights are detected
 */
export default function FlightResultsPoller({
  holidayId,
  initialFlightCount,
  searchJustCompleted = false,
}: FlightResultsPollerProps) {
  const router = useRouter()
  const [hasRefreshed, setHasRefreshed] = useState(false)

  useEffect(() => {
    if (!searchJustCompleted || hasRefreshed) {
      return
    }

    console.log("[Flight Results Poller] Starting to poll for flights...")

    // Poll for flights every 3 seconds, up to 15 times (45 seconds total)
    // Give more time for database to save flights
    let pollCount = 0
    const maxPolls = 15
    let pollInterval: NodeJS.Timeout | null = null
    let fallbackTimeout: NodeJS.Timeout | null = null

    // Wait 5 seconds before starting to poll (give time for search to complete and save to database)
    setTimeout(() => {
      pollInterval = setInterval(async () => {
        pollCount++
        console.log(`[Flight Results Poller] Poll attempt ${pollCount}/${maxPolls}`)

        let requestTimeoutId: NodeJS.Timeout | null = null
        
        try {
          // Check if flights exist by fetching the holiday page data
          // Use AbortController to handle cancellation
          const controller = new AbortController()
          requestTimeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout per request
          
          const response = await fetch(`/api/holidays/${holidayId}/flights?t=${Date.now()}`, {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          })
          
          if (requestTimeoutId) {
            clearTimeout(requestTimeoutId)
            requestTimeoutId = null
          }

          if (response.ok) {
            const data = await response.json()
            const currentFlightCount = data.flights?.length || 0

            console.log(
              `[Flight Results Poller] Found ${currentFlightCount} flights (initial: ${initialFlightCount})`
            )

            // If we have more flights than before, refresh the page data (without full reload)
            if (currentFlightCount > initialFlightCount) {
              console.log(`[Flight Results Poller] New flights detected! (${currentFlightCount} > ${initialFlightCount}) Refreshing page data...`)
              if (pollInterval) clearInterval(pollInterval)
              if (fallbackTimeout) clearTimeout(fallbackTimeout)
              setHasRefreshed(true)
              // Use router.refresh() instead of window.location.reload() - less disruptive
              router.refresh()
              return
            }
          }

          // Stop polling after max attempts and refresh anyway
          if (pollCount >= maxPolls) {
            console.log("[Flight Results Poller] Max polls reached, refreshing page data...")
            if (pollInterval) clearInterval(pollInterval)
            if (fallbackTimeout) clearTimeout(fallbackTimeout)
            setHasRefreshed(true)
            router.refresh()
          }
        } catch (error: any) {
          if (requestTimeoutId) {
            clearTimeout(requestTimeoutId)
          }
          // Only log if it's not an abort error
          if (error?.name !== "AbortError") {
            console.error("[Flight Results Poller] Error polling for flights:", error)
          }
          // On error after a few attempts, refresh anyway
          if (pollCount >= 5) {
            if (pollInterval) clearInterval(pollInterval)
            if (fallbackTimeout) clearTimeout(fallbackTimeout)
            setHasRefreshed(true)
            router.refresh()
          }
        }
      }, 2000) // Poll every 2 seconds (faster polling)
    }, 5000) // Wait 5 seconds before starting to poll (reduced from 8 seconds)

    // Also set a fallback timeout to refresh after 30 seconds regardless
    fallbackTimeout = setTimeout(() => {
      if (!hasRefreshed) {
        console.log("[Flight Results Poller] Fallback timeout reached, refreshing page data...")
        if (pollInterval) clearInterval(pollInterval)
        setHasRefreshed(true)
        router.refresh()
      }
    }, 30000) // 30 second fallback

    // Cleanup
    return () => {
      if (pollInterval) clearInterval(pollInterval)
      if (fallbackTimeout) clearTimeout(fallbackTimeout)
    }
  }, [holidayId, initialFlightCount, searchJustCompleted, hasRefreshed, router])

  return null
}


"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import FlightResultsPoller from "@/components/flight-results-poller"
import { ApiCreditsExhaustedModal } from "@/components/api-credits-exhausted-modal"

export default function UnifiedFlightSearchButton({ 
  holidayId, 
  hasExistingFlights = false,
  initialFlightCount = 0,
  userEmail,
  initialShowCreditsModal,
}: { 
  holidayId: string
  hasExistingFlights?: boolean
  initialFlightCount?: number
  userEmail?: string
  /** When true (e.g. from ?creditsExhausted=1 after create holiday), open the credits exhausted modal on mount */
  initialShowCreditsModal?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchJustCompleted, setSearchJustCompleted] = useState(false)
  const [showCreditsExhaustedModal, setShowCreditsExhaustedModal] = useState(false)

  // Open modal when landing with ?creditsExhausted=1 (e.g. after create holiday) and clear the URL
  useEffect(() => {
    if (!initialShowCreditsModal) return
    setShowCreditsExhaustedModal(true)
    if (typeof window !== "undefined" && window.location.search.includes("creditsExhausted=1")) {
      const url = new URL(window.location.href)
      url.searchParams.delete("creditsExhausted")
      router.replace(url.pathname + url.search, { scroll: false })
    }
  }, [initialShowCreditsModal, router])

  async function runSearch() {
    setLoading(true)
    setError(null)
    setResult(null)
    
    console.log("[Unified Search Button] Starting search for holiday:", holidayId)
    
    try {
      // Use Next.js API route (no backend needed)
      const res = await fetch(`/api/holidays/${holidayId}/search-flights-unified`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      // Parse JSON when possible (503/502 from our API include credits-exhausted code)
      let data: any
      const contentType = res.headers.get("content-type")
      const isJson = contentType?.includes("application/json")

      if (isJson) {
        try {
          data = await res.json()
        } catch (jsonError) {
          const textResponse = await res.text()
          console.error("[Unified Search Button] Failed to parse JSON response:", textResponse.substring(0, 200))
          setError(`Server returned invalid response. Status: ${res.status}`)
          return
        }
      } else {
        // Non-JSON (e.g. 504 gateway page) – use status only
        if (res.status === 504 || res.status === 502 || res.status === 503) {
          setError(
            res.status === 504
              ? "Request timed out. The search is taking too long. Please try again with fewer destinations or a shorter date range."
              : "Server error. Please try again in a moment."
          )
          return
        }
        const textResponse = await res.text()
        console.error("[Unified Search Button] Non-JSON response:", textResponse.substring(0, 200))
        setError(res.status >= 500 ? "Server error occurred. Please try again later." : `Unexpected response format. Status: ${res.status}`)
        return
      }

      console.log("[Unified Search Button] Response:", {
        ok: res.ok,
        status: res.status,
        success: data?.success,
        offers_count: data?.offers?.length || 0,
        message: data?.message,
        code: data?.code,
      })

      // Credits exhausted: show modal (we use 503 with JSON body for this)
      if (data?.code === "SERPAPI_CREDITS_EXHAUSTED") {
        setShowCreditsExhaustedModal(true)
        setError(null)
        setResult(data)
        return
      }

      if (!res.ok) {
        const errorMsg = data?.error || data?.details || "Failed to search flights"
        console.error("[Unified Search Button] Error:", errorMsg, data)
        setError(errorMsg)
        setResult(data)
        return
      }

      setResult(data)
      console.log("[Unified Search Button] Search completed:", {
        success: data.success,
        offers_count: data.offers?.length || 0,
        message: data.message,
        metadata: data.metadata,
        saved_to_db: data.metadata?.saved_to_db || 0,
        debug: data.debug,
      })
      
      // Log detailed metadata
      if (data.metadata) {
        console.log("[Unified Search Button] Detailed metadata:", {
          total_retrieved: data.metadata.total_retrieved,
          total_normalized: data.metadata.total_normalized,
          total_scored: data.metadata.total_scored,
          saved_to_db: data.metadata.saved_to_db,
          optimized_dates: data.metadata.optimized_dates,
          serpapi_calls: data.metadata.serpapi_calls,
        })
      }

      // If search was successful, trigger polling to check for new flights
      if (res.ok && data.success) {
        setSearchJustCompleted(true)
        // Immediately refresh after a short delay to show new flights
        // The FlightResultsPoller will also handle additional polling
        setTimeout(() => {
          router.refresh()
        }, 2000) // Wait 2 seconds for database to save
      }
    } catch (err) {
      console.error("[Unified Search Button] Unexpected error:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <ApiCreditsExhaustedModal
        open={showCreditsExhaustedModal}
        onOpenChange={setShowCreditsExhaustedModal}
        userEmail={userEmail}
      />
      {/* Poll for flight results after search completes */}
      {searchJustCompleted && (
        <FlightResultsPoller
          holidayId={holidayId}
          initialFlightCount={initialFlightCount}
          searchJustCompleted={searchJustCompleted}
        />
      )}
      
      <Button onClick={runSearch} disabled={loading} className="w-full sm:w-auto">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Searching…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            {hasExistingFlights ? "Refresh Flights" : "Search Flights"}
          </>
        )}
      </Button>

      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div>
                <p className="font-medium">Searching for flights...</p>
                <p className="text-sm text-muted-foreground">
                  This may take a few moments while we search multiple providers
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Search Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && !loading && (
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              <CardTitle>
                {result.success ? "Search Completed" : "No Flights Found"}
              </CardTitle>
            </div>
            <CardDescription>
              {result.success 
                ? `Found ${result.offers?.length || 0} flights. Results are displayed below.`
                : result.message || result.error}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}

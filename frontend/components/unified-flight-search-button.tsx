"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import FlightResultsPoller from "@/components/flight-results-poller"

export default function UnifiedFlightSearchButton({ 
  holidayId, 
  hasExistingFlights = false,
  initialFlightCount = 0,
}: { 
  holidayId: string
  hasExistingFlights?: boolean
  initialFlightCount?: number
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchJustCompleted, setSearchJustCompleted] = useState(false)

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

      const data = await res.json()
      
      console.log("[Unified Search Button] Response:", {
        ok: res.ok,
        status: res.status,
        success: data.success,
        offers_count: data.offers?.length || 0,
        message: data.message,
      })

      if (!res.ok) {
        const errorMsg = data.error || data.details || "Failed to search flights"
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
            Searching...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            {hasExistingFlights ? "Re-search Flights" : "AI Unified Flight Search"}
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

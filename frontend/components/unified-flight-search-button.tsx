"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

export default function UnifiedFlightSearchButton({ 
  holidayId, 
  hasExistingFlights = false 
}: { 
  holidayId: string
  hasExistingFlights?: boolean 
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  async function runSearch() {
    setLoading(true)
    setError(null)
    setResult(null)
    
    console.log("[Unified Search Button] Starting search for holiday:", holidayId)
    
    try {
      // Get auth token from Supabase
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`
      }

      const res = await fetch(`${BACKEND_URL}/holidays/${holidayId}/search-flights-unified`, {
        method: "POST",
        headers,
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
        debug: data.debug,
      })

      // If search was successful and flights were saved, refresh the page to show them
      if (res.ok && data.success && data.metadata?.saved_to_db > 0) {
        // Wait a moment for the database to be ready, then refresh
        setTimeout(() => {
          router.refresh()
        }, 1000)
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
        <Card>
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
            <CardDescription>{result.message || result.error}</CardDescription>
          </CardHeader>
          <CardContent>
            {result.success && result.offers && result.offers.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Found {result.offers.length} best-matching flight offers
                </p>
                
                {/* Display flight offers */}
                <div className="space-y-3">
                  {result.offers.map((offer: any, index: number) => (
                    <div key={offer.id || index} className="border rounded-lg p-4 space-y-2">
                      {/* Price and Score */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold">
                            {offer.price?.currency || "EUR"} {offer.price?.total || 0}
                          </span>
                          {offer.score !== undefined && (
                            <span className="text-xs text-muted-foreground">
                              Score: {offer.score}/100
                            </span>
                          )}
                        </div>
                        {offer.booking_link && (
                          <a
                            href={offer.booking_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            Book →
                          </a>
                        )}
                      </div>

                      {/* Flight Segments */}
                      <div className="space-y-2">
                        {offer.segments?.map((segment: any, segIndex: number) => (
                          <div key={segIndex} className="flex items-center gap-3 text-sm">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{segment.from?.code || "N/A"}</span>
                                <span className="text-muted-foreground">→</span>
                                <span className="font-semibold">{segment.to?.code || "N/A"}</span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {segment.airline?.name || "Unknown airline"} {segment.flight_number || ""}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {segment.departure ? new Date(segment.departure).toLocaleString() : "N/A"}
                            </div>
                            {segment.duration_minutes && (
                              <div className="text-xs text-muted-foreground">
                                {Math.floor(segment.duration_minutes / 60)}h {segment.duration_minutes % 60}m
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Layovers */}
                      {offer.layovers && offer.layovers.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {offer.layovers.length} layover{offer.layovers.length > 1 ? "s" : ""}
                          {offer.layovers.map((layover: any, idx: number) => (
                            <span key={idx}>
                              {idx > 0 && ", "}
                              {layover.airport} ({Math.floor(layover.duration_minutes / 60)}h {layover.duration_minutes % 60}m)
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Total Duration and Stops */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {offer.total_duration_minutes && (
                          <span>
                            Total: {Math.floor(offer.total_duration_minutes / 60)}h {offer.total_duration_minutes % 60}m
                          </span>
                        )}
                        {offer.num_stops !== undefined && (
                          <span>
                            {offer.num_stops === 0 ? "Direct" : `${offer.num_stops} stop${offer.num_stops > 1 ? "s" : ""}`}
                          </span>
                        )}
                        {offer.class && (
                          <span className="capitalize">{offer.class}</span>
                        )}
                      </div>

                      {/* Reasoning (if scored) */}
                      {offer.reasoning && (
                        <div className="text-xs text-muted-foreground italic border-t pt-2">
                          {offer.reasoning}
                        </div>
                      )}

                      {/* Notes */}
                      {offer.notes && offer.notes.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {offer.notes.map((note: string, idx: number) => (
                            <div key={idx}>• {note}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {result.metadata && (
                  <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                    <p>Retrieved: {result.metadata.total_retrieved} raw results</p>
                    <p>Normalized: {result.metadata.total_normalized} offers</p>
                    <p>Scored: {result.metadata.total_scored} offers</p>
                    {result.debug?.duration_ms && (
                      <p>Duration: {result.debug.duration_ms}ms</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {result.message || "No flights found matching your criteria"}
                </p>
                {result.details && (
                  <p className="text-xs text-muted-foreground">{result.details}</p>
                )}
                {result.suggestion && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    💡 {result.suggestion}
                  </p>
                )}
                {result.debug && (
                  <div className="text-xs text-muted-foreground mt-3 p-3 bg-muted rounded space-y-1">
                    <p className="font-semibold">Debug Info:</p>
                    <p>Search params: {result.debug.search_params_count || 0}</p>
                    <p>Raw results: {result.debug.raw_results_count || 0}</p>
                    <p>Normalized: {result.debug.normalized_count || 0}</p>
                    {result.metadata?.search_errors && result.metadata.search_errors.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="font-semibold text-destructive">Errors ({result.metadata.search_errors.length}):</p>
                        {result.metadata.search_errors.map((err: any, idx: number) => (
                          <div key={idx} className="mt-1">
                            <p className="text-destructive">
                              {err.params?.departure_id || "Unknown"} → {err.params?.arrival_id || "Unknown"}: {err.error || "Unknown error"}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Check the browser console for detailed debug logs
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

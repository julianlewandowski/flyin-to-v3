"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import PriceAnalysisCard from "./price-analysis-card"
import AlternativeSuggestionsCard from "./alternative-suggestions-card"
import WeatherForecastCard from "./weather-forecast-card"
import type { SmartInsights } from "@/lib/types"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

interface SmartInsightsSectionProps {
  holidayId: string
  hasFlights: boolean
}

export default function SmartInsightsSection({ holidayId, hasFlights }: SmartInsightsSectionProps) {
  const [insights, setInsights] = useState<SmartInsights | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchInsights = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`
      }

      const response = await fetch(`${BACKEND_URL}/holidays/${holidayId}/smart-insights`, {
        method: "GET",
        headers,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || "Failed to fetch insights")
      }

      const data = await response.json()
      setInsights(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load insights")
      console.error("[SmartInsights] Error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-fetch on mount if we have flights
  useEffect(() => {
    if (hasFlights) {
      fetchInsights()
    }
  }, [holidayId, hasFlights])

  if (!hasFlights) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            Smart Insights
          </h2>
        </div>
        <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
          <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            Search for flights to unlock AI-powered insights
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-purple-500" />
          Smart Insights
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchInsights}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </>
          )}
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !insights && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 bg-muted/30 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Insights Cards - Stacked vertically */}
      {insights && (
        <div className="space-y-6">
          <PriceAnalysisCard data={insights.price_analysis} />
          <AlternativeSuggestionsCard data={insights.alternative_suggestions} />
          <WeatherForecastCard data={insights.weather_forecast} />
        </div>
      )}
    </div>
  )
}

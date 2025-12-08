"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2, RefreshCw } from "lucide-react"
import PriceAnalysisCard from "./price-analysis-card"
import AlternativeSuggestionsCard from "./alternative-suggestions-card"
import WeatherForecastCard from "./weather-forecast-card"
import type { SmartInsights } from "@/lib/types"

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
      // Use Next.js API route instead of direct backend call
      const response = await fetch(`/api/holidays/${holidayId}/smart-insights`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        let errorData: any = {}
        let errorMessage = `Failed to fetch insights (HTTP ${response.status})`
        
        try {
          const text = await response.text()
          if (text) {
            try {
              errorData = JSON.parse(text)
            } catch {
              // Not JSON, use text as error
              errorData = { error: text }
            }
          }
        } catch (parseError) {
          console.error("[SmartInsights] Error parsing response:", parseError)
          errorData = {}
        }
        
        // Extract error message from various possible fields
        errorMessage = errorData.error || 
                     errorData.detail || 
                     errorData.message || 
                     (typeof errorData === 'string' ? errorData : null) ||
                     `Failed to fetch insights (HTTP ${response.status})`
        
        console.error("[SmartInsights] API error:", {
          status: response.status,
          statusText: response.statusText,
          errorData,
          url: response.url
        })
        
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      // Check if insights generation failed
      if (data.success === false) {
        setError(data.error || "Failed to generate insights")
        setInsights(null)
        return
      }
      
      setInsights(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load insights"
      setError(errorMessage)
      console.error("[SmartInsights] Error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-fetch on mount if we have flights (but don't show error if it fails silently)
  useEffect(() => {
    if (hasFlights) {
      fetchInsights().catch((err) => {
        // Silently fail - insights are optional
        console.warn("[SmartInsights] Failed to load insights (optional feature):", err)
        setError(null) // Don't show error to user
      })
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

      {/* Error State - Only show if user manually tried to refresh */}
      {error && isLoading === false && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            {error.includes("connect") || error.includes("backend")
              ? "Unable to load insights. The backend service may be unavailable."
              : "Unable to generate insights at this time. This feature is optional."}
          </p>
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
          {insights.price_analysis && !insights.price_analysis.error && (
            <PriceAnalysisCard data={insights.price_analysis} />
          )}
          {insights.alternative_suggestions && !insights.alternative_suggestions.error && (
            <AlternativeSuggestionsCard data={insights.alternative_suggestions} />
          )}
          {insights.weather_forecast && !insights.weather_forecast.error && (
            <WeatherForecastCard data={insights.weather_forecast} />
          )}
          {/* Show message if all insights failed */}
          {insights.price_analysis?.error && 
           insights.alternative_suggestions?.error && 
           insights.weather_forecast?.error && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                Unable to generate insights at this time. This may be due to missing API keys or service errors.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

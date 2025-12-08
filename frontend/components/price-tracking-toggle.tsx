"use client"

import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Bell, BellOff, Loader2, TrendingDown, Info } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface PriceTrackingToggleProps {
  holidayId: string
  initialEnabled?: boolean
  initialLastPrice?: number | null
  initialThreshold?: number
  hasFlights?: boolean
  onStatusChange?: (enabled: boolean) => void
}

export default function PriceTrackingToggle({
  holidayId,
  initialEnabled = false,
  initialLastPrice = null,
  initialThreshold = 10,
  hasFlights = false,
  onStatusChange,
}: PriceTrackingToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [loading, setLoading] = useState(false)
  const [lastPrice, setLastPrice] = useState<number | null>(initialLastPrice)
  const [threshold] = useState(initialThreshold)
  const [error, setError] = useState<string | null>(null)

  // Sync with initial props when they change
  useEffect(() => {
    setEnabled(initialEnabled)
    setLastPrice(initialLastPrice)
  }, [initialEnabled, initialLastPrice])

  const handleToggle = async (newValue: boolean) => {
    if (loading) return

    // Don't allow enabling if no flights
    if (newValue && !hasFlights) {
      setError("Search for flights first to enable price tracking")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const endpoint = newValue
        ? `/api/holidays/${holidayId}/price-tracking/enable`
        : `/api/holidays/${holidayId}/price-tracking/disable`

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          threshold_percent: threshold,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update price tracking")
      }

      setEnabled(newValue)
      if (newValue && data.last_tracked_price !== undefined) {
        setLastPrice(data.last_tracked_price)
      }

      onStatusChange?.(newValue)
    } catch (err) {
      console.error("[PriceTracking] Toggle error:", err)
      setError(err instanceof Error ? err.message : "Failed to update tracking")
      // Revert the visual state
      setEnabled(!newValue)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center transition-colors ${
              enabled 
                ? "bg-blue-500 text-white" 
                : "bg-gray-200 text-gray-500"
            }`}>
              {enabled ? (
                <Bell className="h-5 w-5" />
              ) : (
                <BellOff className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Label 
                  htmlFor="price-tracking-toggle" 
                  className="text-sm font-semibold text-gray-900 cursor-pointer"
                >
                  Track prices for this holiday
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3.5 w-3.5 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        We'll check flight prices daily and notify you when prices 
                        drop by {threshold}% or more.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                {enabled ? (
                  lastPrice ? (
                    <span className="flex items-center gap-1">
                      <TrendingDown className="h-3 w-3 text-blue-500" />
                      Tracking from €{lastPrice.toFixed(0)} • Alert on {threshold}%+ drop
                    </span>
                  ) : (
                    "Tracking enabled • Waiting for price data"
                  )
                ) : (
                  hasFlights 
                    ? "Get notified when prices drop" 
                    : "Search for flights to enable tracking"
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            )}
            <Switch
              id="price-tracking-toggle"
              checked={enabled}
              onCheckedChange={handleToggle}
              disabled={loading || (!hasFlights && !enabled)}
              className="data-[state=checked]:bg-blue-500"
            />
          </div>
        </div>
        
        {error && (
          <p className="text-xs text-red-600 mt-2 pl-13">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}


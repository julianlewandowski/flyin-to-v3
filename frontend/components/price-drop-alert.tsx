"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingDown, Sparkles, X, ExternalLink, Loader2, Calendar, MapPin } from "lucide-react"
import type { PriceDropAlert as PriceDropAlertType } from "@/lib/types"

interface PriceDropAlertProps {
  alert: PriceDropAlertType
  holidayName?: string
  showHolidayName?: boolean
  onResolve?: (alertId: string) => void
  onViewFlights?: () => void
}

export default function PriceDropAlert({
  alert,
  holidayName,
  showHolidayName = false,
  onResolve,
  onViewFlights,
}: PriceDropAlertProps) {
  const [resolving, setResolving] = useState(false)
  const [resolved, setResolved] = useState(false)

  const handleResolve = async () => {
    if (resolving || resolved) return

    setResolving(true)
    try {
      const response = await fetch(`/api/price-alerts/${alert.id}/resolve`, {
        method: "POST",
      })

      if (response.ok) {
        setResolved(true)
        onResolve?.(alert.id)
      }
    } catch (error) {
      console.error("[PriceDropAlert] Resolve error:", error)
    } finally {
      setResolving(false)
    }
  }

  if (resolved) {
    return null
  }

  const savings = alert.old_price - alert.new_price

  return (
    <Card className="border-emerald-300 bg-gradient-to-r from-emerald-50 to-green-50 shadow-sm overflow-hidden">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Icon and message */}
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-200">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-gray-900 text-lg">
                  Good news — prices dropped!
                </h3>
                <Badge className="bg-emerald-500 text-white hover:bg-emerald-600">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  {alert.percent_drop.toFixed(0)}% off
                </Badge>
              </div>
              
              {showHolidayName && holidayName && (
                <p className="text-sm text-gray-600">
                  For your holiday: <span className="font-medium text-gray-900">{holidayName}</span>
                </p>
              )}

              {/* Price comparison */}
              <div className="flex items-center gap-3 mt-2">
                <span className="text-gray-500 line-through text-lg">
                  €{alert.old_price.toFixed(0)}
                </span>
                <span className="text-emerald-600 font-bold text-2xl">
                  €{alert.new_price.toFixed(0)}
                </span>
                <span className="text-emerald-600 text-sm font-medium bg-emerald-100 px-2 py-0.5 rounded-full">
                  Save €{savings.toFixed(0)}
                </span>
              </div>

              {/* Route and date info */}
              {(alert.route_info || alert.date_info) && (
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                  {alert.route_info?.origin && alert.route_info?.destination && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {alert.route_info.origin} → {alert.route_info.destination}
                    </span>
                  )}
                  {alert.date_info?.departure_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(alert.date_info.departure_date).toLocaleDateString()}
                      {alert.date_info.return_date && (
                        <> - {new Date(alert.date_info.return_date).toLocaleDateString()}</>
                      )}
                    </span>
                  )}
                </div>
              )}

              {/* Timestamp */}
              <p className="text-xs text-gray-500 mt-1">
                Detected {new Date(alert.created_at).toLocaleDateString()} at{" "}
                {new Date(alert.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {onViewFlights && (
              <Button
                onClick={onViewFlights}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                <ExternalLink className="h-4 w-4 mr-1.5" />
                View Fares
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleResolve}
              disabled={resolving}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              title="Dismiss alert"
            >
              {resolving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Compact version for dashboard list
interface CompactPriceDropBadgeProps {
  percentDrop: number
  oldPrice: number
  newPrice: number
}

export function CompactPriceDropBadge({ 
  percentDrop, 
  oldPrice, 
  newPrice 
}: CompactPriceDropBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 text-xs">
        <TrendingDown className="h-3 w-3 mr-1" />
        -{percentDrop.toFixed(0)}%
      </Badge>
      <span className="text-xs text-gray-500">
        <span className="line-through">€{oldPrice.toFixed(0)}</span>
        {" → "}
        <span className="text-emerald-600 font-medium">€{newPrice.toFixed(0)}</span>
      </span>
    </div>
  )
}


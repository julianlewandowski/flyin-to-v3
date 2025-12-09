"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { TrendingDown, X, Bell, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AlertData {
  id: string
  holiday_id: string
  holiday_name: string
  old_price: number
  new_price: number
  percent_drop: number
}

interface GlobalPriceAlertBannerProps {
  /** If provided, will only show alerts for this holiday ID */
  holidayId?: string
  /** Custom class name for the banner */
  className?: string
}

export default function GlobalPriceAlertBanner({ 
  holidayId,
  className = "" 
}: GlobalPriceAlertBannerProps) {
  const [alerts, setAlerts] = useState<AlertData[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch("/api/price-alerts/active")
        const data = await response.json()

        if (data.success && data.alerts) {
          let filteredAlerts = data.alerts
          
          // If holidayId is provided, filter to only that holiday's alerts
          if (holidayId) {
            filteredAlerts = filteredAlerts.filter(
              (alert: AlertData) => alert.holiday_id === holidayId
            )
          }
          
          setAlerts(filteredAlerts)
        }
      } catch (error) {
        console.error("[GlobalPriceAlert] Fetch error:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
  }, [holidayId])

  const handleDismiss = () => {
    setDismissed(true)
  }

  // Don't render if loading, dismissed, or no alerts
  if (loading || dismissed || alerts.length === 0) {
    return null
  }

  // Calculate total potential savings
  const totalSavings = alerts.reduce(
    (sum, alert) => sum + (alert.old_price - alert.new_price),
    0
  )

  // Get unique holiday count
  const uniqueHolidays = new Set(alerts.map(a => a.holiday_id)).size

  return (
    <div 
      className={`bg-gradient-to-r from-emerald-600/95 to-teal-500/95 backdrop-blur-md text-white py-3 px-4 shadow-lg border-b border-emerald-500/30 animate-fade-in-up ${className}`}
    >
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center animate-pulse-slow">
            <Bell className="h-4 w-4 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            <span className="font-medium text-sm md:text-base">
              {alerts.length === 1 ? (
                <>
                  Price dropped <strong>{alerts[0].percent_drop.toFixed(0)}%</strong> for{" "}
                  <strong>{alerts[0].holiday_name}</strong>!
                </>
              ) : (
                <>
                  <strong>{alerts.length} price drops</strong> detected
                  {uniqueHolidays > 1 && <> across {uniqueHolidays} holidays</>}
                  {" — "}save up to <strong>€{totalSavings.toFixed(0)}</strong>
                </>
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {alerts.length === 1 ? (
            <Link href={`/dashboard/holidays/${alerts[0].holiday_id}`}>
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs md:text-sm rounded-full backdrop-blur-sm"
              >
                View Deals
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          ) : (
            <Link href="/dashboard">
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs md:text-sm rounded-full backdrop-blur-sm"
              >
                View All Alerts
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDismiss}
            className="text-white/80 hover:text-white hover:bg-white/20 h-8 w-8 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Simpler inline version for use in headers
export function InlinePriceAlertIndicator() {
  const [alertCount, setAlertCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch("/api/price-alerts/active")
        const data = await response.json()

        if (data.success) {
          setAlertCount(data.total_count || 0)
        }
      } catch (error) {
        console.error("[InlinePriceAlert] Fetch error:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
  }, [])

  if (loading) {
    return (
      <div className="h-8 w-8 flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (alertCount === 0) {
    return null
  }

  return (
    <Link href="/dashboard" className="relative group">
      <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center transition-colors group-hover:bg-emerald-200">
        <Bell className="h-4 w-4 text-emerald-600" />
      </div>
      <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
        {alertCount > 9 ? "9+" : alertCount}
      </span>
    </Link>
  )
}

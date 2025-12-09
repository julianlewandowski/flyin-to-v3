"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Bell, BellOff, TrendingDown, Mail, Calendar, Check } from "lucide-react"

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

  const handleToggle = () => {
    const newValue = !enabled
    setEnabled(newValue)
    onStatusChange?.(newValue)
    // Demo mode: no API calls, just visual toggle
  }

  return (
    <Card className={`overflow-hidden transition-all duration-500 ${
      enabled 
        ? "bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-emerald-200 shadow-lg shadow-emerald-100/50" 
        : "bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 border-gray-200"
    }`}>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center justify-between gap-6">
          {/* Left side: Icon and description */}
          <div className="flex items-center gap-4">
            {/* Icon container */}
            <div className={`relative h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-500 ${
              enabled 
                ? "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-200" 
                : "bg-gradient-to-br from-gray-300 to-gray-400"
            }`}>
              {enabled ? (
                <Bell className="h-6 w-6 text-white" />
              ) : (
                <BellOff className="h-6 w-6 text-white" />
              )}
              {/* Ping animation when enabled */}
              {enabled && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                </span>
              )}
            </div>
            
            <div>
              {/* Title */}
              <h3 className="text-base font-bold text-gray-900">
                Automatic Price Tracking
              </h3>
              
              {/* Description */}
              <p className={`text-sm mt-0.5 transition-colors duration-300 ${
                enabled ? "text-emerald-600" : "text-gray-500"
              }`}>
                {enabled 
                  ? "We'll notify you when prices drop" 
                  : "Get alerts when flights get cheaper"
                }
              </p>
            </div>
          </div>
          
          {/* Right side: Toggle Button */}
          <button
            onClick={handleToggle}
            className={`
              relative px-6 py-3 rounded-xl font-semibold text-sm
              transition-all duration-300 ease-out
              transform active:scale-95
              ${enabled 
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300" 
                : "bg-white text-gray-700 border-2 border-gray-200 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50"
              }
            `}
          >
            <span className="flex items-center gap-2">
              {enabled ? (
                <>
                  <Check className="h-4 w-4" />
                  Tracking On
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4" />
                  Enable Tracking
                </>
              )}
            </span>
          </button>
        </div>
        
        {/* Feature badges when enabled */}
        {enabled && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-emerald-200/50 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-100/80 px-3 py-1.5 rounded-full">
              <Calendar className="h-3.5 w-3.5" />
              Daily price checks
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-teal-700 bg-teal-100/80 px-3 py-1.5 rounded-full">
              <TrendingDown className="h-3.5 w-3.5" />
              Price drop alerts
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-cyan-700 bg-cyan-100/80 px-3 py-1.5 rounded-full">
              <Mail className="h-3.5 w-3.5" />
              Email notifications
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

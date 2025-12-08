"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingDown, BarChart3, Sparkles } from "lucide-react"
import type { PriceAnalysis, PriceHistogramData } from "@/lib/types"

// All 12 months
const ALL_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

interface PriceAnalysisCardProps {
  data: PriceAnalysis
}

export default function PriceAnalysisCard({ data }: PriceAnalysisCardProps) {
  if (!data || data.histogram?.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Price Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No price data available yet. Search for flights to see price trends.
          </p>
        </CardContent>
      </Card>
    )
  }

  const { histogram, stats, best_month, cheapest_flight, ai_summary } = data
  
  // Create a map of existing data by month abbreviation
  const dataByMonth: Record<string, PriceHistogramData> = {}
  histogram.forEach(item => {
    const monthAbbr = item.month.split(" ")[0] // "Dec 2024" -> "Dec"
    dataByMonth[monthAbbr] = item
  })
  
  // Calculate min and max for scaling
  const prices = histogram.map(h => h.avg_price)
  const maxPrice = Math.max(...prices)
  const minPrice = Math.min(...prices)
  const priceRange = maxPrice - minPrice
  
  // Calculate height: use relative scaling from min to max
  // Cheapest = 30% height, most expensive = 100% height
  const getHeightPercent = (price: number) => {
    if (priceRange === 0) return 65 // All same price - medium height
    const normalized = (price - minPrice) / priceRange // 0 to 1
    // Invert: lower price = shorter bar (cheaper is better, shown as lower)
    // Actually let's show higher price = taller bar (standard chart)
    return 30 + (normalized * 70) // 30% to 100%
  }
  
  // Find best month abbreviation
  const bestMonthAbbr = best_month ? best_month.month.split(" ")[0] : null
  
  return (
    <Card className="overflow-hidden py-0">
      <CardHeader className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Price Analysis
          </CardTitle>
          {best_month && (
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Best: {best_month.month}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="py-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <p className="text-2xl font-bold text-green-600">€{stats.min_price}</p>
            <p className="text-xs text-muted-foreground">Lowest</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold">€{Math.round(stats.average_price)}</p>
            <p className="text-xs text-muted-foreground">Average</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-red-500">€{stats.max_price}</p>
            <p className="text-xs text-muted-foreground">Highest</p>
          </div>
        </div>

        {/* Histogram - All 12 months */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Monthly Price Trends</p>
            <p className="text-[10px] text-muted-foreground">€{Math.round(minPrice)} - €{Math.round(maxPrice)}</p>
          </div>
          
          {/* Chart container */}
          <div className="relative">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              <div className="border-b border-dashed border-muted-foreground/20" />
              <div className="border-b border-dashed border-muted-foreground/20" />
              <div className="border-b border-dashed border-muted-foreground/20" />
            </div>
            
            {/* Bars */}
            <div className="grid grid-cols-12 gap-1 h-32">
              {ALL_MONTHS.map((month) => {
                const monthData = dataByMonth[month]
                const hasData = !!monthData
                const isEstimated = monthData?.is_estimated ?? false
                const heightPercent = hasData ? getHeightPercent(monthData.avg_price) : 0
                const isBest = month === bestMonthAbbr
                
                return (
                  <div key={month} className="flex flex-col items-center group relative h-full">
                    {/* Bar container - takes most of the height */}
                    <div className="flex-1 w-full flex items-end justify-center">
                      {hasData ? (
                        <div
                          className={`w-full max-w-[20px] rounded-t transition-all cursor-pointer hover:opacity-80 ${
                            isBest 
                              ? "bg-gradient-to-t from-green-600 to-green-400 shadow-sm shadow-green-500/30" 
                              : isEstimated
                                ? "bg-gradient-to-t from-amber-500/70 to-amber-400/70"
                                : "bg-gradient-to-t from-blue-600 to-blue-400"
                          }`}
                          style={{ height: `${heightPercent}%` }}
                          title={`${month}: €${Math.round(monthData.avg_price)}${isEstimated ? " (estimated)" : ` (${monthData.flight_count} flights)`}`}
                        />
                      ) : (
                        <div 
                          className="w-full max-w-[20px] bg-muted/40 rounded-t"
                          style={{ height: "8px" }}
                          title={`${month}: No data`}
                        />
                      )}
                    </div>
                    
                    {/* Month label */}
                    <span className={`text-[9px] font-medium mt-1 ${
                      isBest 
                        ? "text-green-600 font-bold" 
                        : hasData 
                          ? isEstimated ? "text-amber-600/80" : "text-foreground"
                          : "text-muted-foreground/50"
                    }`}>
                      {month}
                    </span>
                    
                    {/* Hover tooltip */}
                    {hasData && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-popover border rounded px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap z-10 shadow-sm">
                        €{Math.round(monthData.avg_price)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground flex-wrap pt-1">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-green-600 to-green-400" />
              <span>Best</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-blue-600 to-blue-400" />
              <span>Actual</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-amber-500/70 to-amber-400/70" />
              <span>Estimated</span>
            </div>
          </div>
        </div>

        {/* Best Deal Highlight */}
        {cheapest_flight && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-green-600" />
              <span className="text-sm font-semibold text-green-700 dark:text-green-400">Best Deal Found</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-green-600">€{cheapest_flight.price}</span>
              {cheapest_flight.airline && (
                <span className="text-sm text-muted-foreground">with {cheapest_flight.airline}</span>
              )}
            </div>
            {cheapest_flight.date && (
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(cheapest_flight.date).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            )}
          </div>
        )}

        {/* AI Summary */}
        {ai_summary && (
          <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
            <Sparkles className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground leading-relaxed">{ai_summary}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plane, ExternalLink, Clock, Luggage, TrendingDown, ChevronRight, ArrowRight } from "lucide-react"
import type { Flight } from "@/lib/types"

interface FlightCardProps {
  flight: Flight
  onClick?: () => void
}

// Format date consistently for server and client (prevents hydration errors)
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "N/A"
  const date = new Date(dateString)
  // Use a consistent format that works the same on server and client
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${month}/${day}/${year}`
}

// Format date and time consistently
function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return "N/A"
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${month}/${day}/${year} ${hours}:${minutes}`
}

export default function FlightCard({ flight, onClick }: FlightCardProps) {
  const priceDropped = flight.old_price && flight.price < flight.old_price
  const priceDropPercent = priceDropped
    ? (((flight.old_price! - flight.price) / flight.old_price!) * 100).toFixed(0)
    : null

  const handleBookingClick = (e: React.MouseEvent) => {
    // Stop propagation so clicking the booking button doesn't open the modal
    e.stopPropagation()
  }

  return (
    <Card
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick?.()
        }
      }}
      className={`
        transition-all duration-300 cursor-pointer group border-border outline-none
        hover:shadow-xl hover:border-primary/30 hover:-translate-y-1
        focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background
        ${priceDropped ? "ring-2 ring-orange-500/20 border-orange-500/40 bg-orange-50/10" : ""}
      `}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="flex-1 w-full">
            {/* Outbound Leg */}
            <div className="mb-5 pb-5 border-b border-border/50">
              <div className="flex items-center gap-6 mb-4">
                <div className="text-center min-w-[60px]">
                  <p className="text-2xl font-black text-foreground">{flight.origin}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">From</p>
                </div>
                
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-full flex items-center gap-2">
                    <div className="h-[2px] flex-1 bg-border group-hover:bg-primary/30 transition-colors" />
                    <Plane className="h-5 w-5 text-primary rotate-90" />
                    <div className="h-[2px] flex-1 bg-border group-hover:bg-primary/30 transition-colors" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">{flight.flight_duration || "Duration N/A"}</p>
                </div>

                <div className="text-center min-w-[60px]">
                  <p className="text-2xl font-black text-foreground">{flight.destination}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">To</p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="rounded-full px-3 font-normal">
                    Outbound
                  </Badge>
                  <span className="font-semibold text-foreground">{formatDate(flight.departure_date)}</span>
                </div>
                {flight.airline && (
                  <div className="font-medium text-muted-foreground">
                    {flight.airline}
                  </div>
                )}
              </div>
            </div>

            {/* Return Leg */}
            {flight.return_date && (
              <div className="mb-5">
                <div className="flex items-center gap-6 mb-4">
                  <div className="text-center min-w-[60px]">
                    <p className="text-2xl font-black text-foreground">{flight.destination}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">From</p>
                  </div>
                  
                  <div className="flex-1 flex flex-col items-center">
                    <div className="w-full flex items-center gap-2">
                      <div className="h-[2px] flex-1 bg-border group-hover:bg-primary/30 transition-colors" />
                      <Plane className="h-5 w-5 text-primary -rotate-90" />
                      <div className="h-[2px] flex-1 bg-border group-hover:bg-primary/30 transition-colors" />
                    </div>
                  </div>

                  <div className="text-center min-w-[60px]">
                    <p className="text-2xl font-black text-foreground">{flight.origin}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">To</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="rounded-full px-3 font-normal">
                      Return
                    </Badge>
                    <span className="font-semibold text-foreground">{formatDate(flight.return_date)}</span>
                  </div>
                  {flight.airline && (
                    <div className="font-medium text-muted-foreground">
                      {flight.airline}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              {flight.airline && (
                <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                  {flight.airline}
                </Badge>
              )}
              {flight.layovers !== undefined && (
                <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                  {flight.layovers === 0 ? "Direct" : `${flight.layovers} stop${flight.layovers > 1 ? "s" : ""}`}
                </Badge>
              )}
              {flight.source && (
                <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
                  {flight.source}
                </Badge>
              )}
            </div>

            {flight.baggage_info && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 bg-secondary/50 p-2 rounded-lg inline-flex">
                <Luggage className="h-3.5 w-3.5" />
                <span>
                  Cabin: <span className="font-medium text-foreground">{flight.baggage_info.cabin || "N/A"}</span>
                  <span className="mx-2 text-border">|</span> 
                  Checked: <span className="font-medium text-foreground">{flight.baggage_info.checked || "N/A"}</span>
                </span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                {flight.verified_at
                  ? `Verified: ${formatDateTime(flight.verified_at)}`
                  : `Last checked: ${formatDateTime(flight.last_checked)}`}
              </p>
              {/* Click indicator */}
              <div className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0 duration-300">
                <span>View details</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </div>
          
          {/* Price Section */}
          <div className="text-right flex-shrink-0 md:w-48 flex flex-col items-end justify-between h-full border-l border-border/50 pl-6 md:pl-0 md:border-l-0">
            <div>
              {priceDropped && (
                <div className="flex items-center justify-end gap-1 text-orange-600 text-sm mb-1 animate-pulse-slow">
                  <TrendingDown className="h-4 w-4" />
                  <span className="font-bold">-{priceDropPercent}%</span>
                </div>
              )}
              {flight.old_price && priceDropped && (
                <p className="text-sm line-through text-muted-foreground mb-1">€{flight.old_price.toLocaleString()}</p>
              )}
              <p className="text-4xl font-black text-primary tracking-tight mb-4">€{flight.price.toLocaleString()}</p>
            </div>
            
            {(flight.deal_url || flight.referral_link || flight.booking_link) && (
              <a 
                href={flight.deal_url || flight.referral_link || flight.booking_link!} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={handleBookingClick}
                className="w-full"
              >
                <Button size="lg" className="w-full gap-2 shadow-md hover:shadow-lg transition-all rounded-xl">
                  View Deal
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plane, ExternalLink, Clock, Luggage, TrendingDown } from "lucide-react"
import type { Flight } from "@/lib/types"

interface FlightCardProps {
  flight: Flight
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

export default function FlightCard({ flight }: FlightCardProps) {
  const priceDropped = flight.old_price && flight.price < flight.old_price
  const priceDropPercent = priceDropped
    ? (((flight.old_price! - flight.price) / flight.old_price!) * 100).toFixed(0)
    : null

  return (
    <Card className={priceDropped ? "border-orange-500/50 bg-orange-500/5" : ""}>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="flex-1">
            {/* Outbound Leg */}
            <div className="mb-4 pb-4 border-b border-gray-300">
              <div className="flex items-center gap-4 mb-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Outbound</p>
                  <p className="text-sm text-gray-600 mb-1">From</p>
                  <p className="font-bold text-lg text-gray-900">{flight.origin}</p>
                </div>
                <Plane className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Outbound</p>
                  <p className="text-sm text-gray-600 mb-1">To</p>
                  <p className="font-bold text-lg text-gray-900">{flight.destination}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Departure: </span>
                  <span className="font-semibold text-gray-900">{formatDate(flight.departure_date)}</span>
                </div>
                {flight.airline && (
                  <div>
                    <span className="text-gray-600">Airline: </span>
                    <span className="font-semibold text-gray-900">{flight.airline}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Return Leg */}
            {flight.return_date && (
              <div className="mb-4">
                <div className="flex items-center gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Return</p>
                    <p className="text-sm text-gray-600 mb-1">From</p>
                    <p className="font-bold text-lg text-gray-900">{flight.destination}</p>
                  </div>
                  <Plane className="h-5 w-5 text-blue-500 rotate-180" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Return</p>
                    <p className="text-sm text-gray-600 mb-1">To</p>
                    <p className="font-bold text-lg text-gray-900">{flight.origin}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Return: </span>
                    <span className="font-semibold text-gray-900">{formatDate(flight.return_date)}</span>
                  </div>
                  {flight.airline && (
                    <div>
                      <span className="text-gray-600">Airline: </span>
                      <span className="font-semibold text-gray-900">{flight.airline}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-3">
              {flight.airline && (
                <Badge variant="outline" className="text-xs border-gray-300 text-gray-700">
                  {flight.airline}
                </Badge>
              )}
              {flight.layovers !== undefined && (
                <Badge variant="outline" className="text-xs border-gray-300 text-gray-700">
                  {flight.layovers === 0 ? "Direct" : `${flight.layovers} stop${flight.layovers > 1 ? "s" : ""}`}
                </Badge>
              )}
              {flight.flight_duration && (
                <Badge variant="outline" className="text-xs flex items-center gap-1 border-gray-300 text-gray-700">
                  <Clock className="h-3 w-3" />
                  {flight.flight_duration}
                </Badge>
              )}
              {flight.source && (
                <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
                  {flight.source}
                </Badge>
              )}
            </div>

            {flight.baggage_info && (
              <div className="flex items-center gap-1 text-xs text-gray-600 mb-3">
                <Luggage className="h-3 w-3" />
                <span>
                  Cabin: {flight.baggage_info.cabin || "N/A"} | Checked: {flight.baggage_info.checked || "N/A"}
                </span>
              </div>
            )}

            <p className="text-xs text-gray-600">
              {flight.verified_at
                ? `Verified: ${formatDateTime(flight.verified_at)}`
                : `Last checked: ${formatDateTime(flight.last_checked)}`}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            {priceDropped && (
              <div className="flex items-center justify-end gap-1 text-orange-600 text-sm mb-2">
                <TrendingDown className="h-4 w-4" />
                <span className="font-bold">-{priceDropPercent}%</span>
              </div>
            )}
            {flight.old_price && priceDropped && (
              <p className="text-sm line-through text-gray-500 mb-1">€{flight.old_price.toLocaleString()}</p>
            )}
            <p className="text-3xl font-black text-blue-600 mb-3">€{flight.price.toLocaleString()}</p>
            {(flight.deal_url || flight.referral_link || flight.booking_link) && (
              <a 
                href={flight.deal_url || flight.referral_link || flight.booking_link!} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button size="sm" className="w-full md:w-auto">
                  View Deal
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

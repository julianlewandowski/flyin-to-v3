import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plane, ExternalLink, Clock, Luggage, TrendingDown } from "lucide-react"
import type { Flight } from "@/lib/types"

interface FlightCardProps {
  flight: Flight
}

export default function FlightCard({ flight }: FlightCardProps) {
  const priceDropped = flight.old_price && flight.price < flight.old_price
  const priceDropPercent = priceDropped
    ? (((flight.old_price! - flight.price) / flight.old_price!) * 100).toFixed(0)
    : null

  return (
    <Card className={priceDropped ? "border-orange-500/50" : ""}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Outbound Leg */}
            <div className="mb-4 pb-4 border-b">
              <div className="flex items-center gap-4 mb-2">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Outbound</p>
                  <p className="text-sm text-muted-foreground">From</p>
                  <p className="font-semibold text-lg">{flight.origin}</p>
                </div>
                <Plane className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Outbound</p>
                  <p className="text-sm text-muted-foreground">To</p>
                  <p className="font-semibold text-lg">{flight.destination}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Departure: </span>
                  <span className="font-medium">{new Date(flight.departure_date).toLocaleDateString()}</span>
                </div>
                {flight.airline && (
                  <div>
                    <span className="text-muted-foreground">Airline: </span>
                    <span className="font-medium">{flight.airline}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Return Leg */}
            {flight.return_date && (
              <div className="mb-4">
                <div className="flex items-center gap-4 mb-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Return</p>
                    <p className="text-sm text-muted-foreground">From</p>
                    <p className="font-semibold text-lg">{flight.destination}</p>
                  </div>
                  <Plane className="h-5 w-5 text-muted-foreground rotate-180" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Return</p>
                    <p className="text-sm text-muted-foreground">To</p>
                    <p className="font-semibold text-lg">{flight.origin}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Return: </span>
                    <span className="font-medium">{new Date(flight.return_date).toLocaleDateString()}</span>
                  </div>
                  {flight.airline && (
                    <div>
                      <span className="text-muted-foreground">Airline: </span>
                      <span className="font-medium">{flight.airline}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-2">
              {flight.airline && (
                <Badge variant="outline" className="text-xs">
                  {flight.airline}
                </Badge>
              )}
              {flight.layovers !== undefined && (
                <Badge variant="outline" className="text-xs">
                  {flight.layovers === 0 ? "Direct" : `${flight.layovers} stop${flight.layovers > 1 ? "s" : ""}`}
                </Badge>
              )}
              {flight.flight_duration && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {flight.flight_duration}
                </Badge>
              )}
              {flight.source && (
                <Badge variant="secondary" className="text-xs">
                  {flight.source}
                </Badge>
              )}
            </div>

            {flight.baggage_info && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <Luggage className="h-3 w-3" />
                <span>
                  Cabin: {flight.baggage_info.cabin || "N/A"} | Checked: {flight.baggage_info.checked || "N/A"}
                </span>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {flight.verified_at
                ? `Verified: ${new Date(flight.verified_at).toLocaleString()}`
                : `Last checked: ${new Date(flight.last_checked).toLocaleString()}`}
            </p>
          </div>
          <div className="text-right">
            {priceDropped && (
              <div className="flex items-center gap-1 text-orange-500 text-sm mb-1">
                <TrendingDown className="h-4 w-4" />
                <span className="font-semibold">-{priceDropPercent}%</span>
              </div>
            )}
            {flight.old_price && priceDropped && (
              <p className="text-sm line-through text-muted-foreground">€{flight.old_price.toLocaleString()}</p>
            )}
            <p className="text-3xl font-bold text-primary">€{flight.price.toLocaleString()}</p>
            {(flight.referral_link || flight.booking_link) && (
              <a href={flight.referral_link || flight.booking_link!} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="mt-2">
                  Book Now
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

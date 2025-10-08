import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plane, ExternalLink } from "lucide-react"
import type { Flight } from "@/lib/types"

interface FlightCardProps {
  flight: Flight
}

export default function FlightCard({ flight }: FlightCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-3">
              <div>
                <p className="text-sm text-muted-foreground">From</p>
                <p className="font-semibold text-lg">{flight.origin}</p>
              </div>
              <Plane className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">To</p>
                <p className="font-semibold text-lg">{flight.destination}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Departure: </span>
                <span className="font-medium">{new Date(flight.departure_date).toLocaleDateString()}</span>
              </div>
              {flight.return_date && (
                <div>
                  <span className="text-muted-foreground">Return: </span>
                  <span className="font-medium">{new Date(flight.return_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
            {flight.airline && <p className="text-sm text-muted-foreground mt-2">Airline: {flight.airline}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              Last checked: {new Date(flight.last_checked).toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-primary">${flight.price.toLocaleString()}</p>
            {flight.booking_link && (
              <a href={flight.booking_link} target="_blank" rel="noopener noreferrer">
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

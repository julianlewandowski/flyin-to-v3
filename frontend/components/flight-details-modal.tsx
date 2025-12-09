"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Plane,
  Clock,
  Calendar,
  Luggage,
  CreditCard,
  ExternalLink,
  Building2,
  Users,
  Leaf,
  ArrowRight,
  CircleDot,
  AlertTriangle,
  Moon,
  Info,
  RotateCcw,
} from "lucide-react"
import type { Flight, FlightDetailsData, SegmentData, LayoverData } from "@/lib/types"

interface FlightDetailsModalProps {
  flight: Flight | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Format time from datetime string
function formatTime(dateString: string | null | undefined): string {
  if (!dateString) return "--:--"
  try {
    const date = new Date(dateString)
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  } catch {
    return "--:--"
  }
}

// Format date
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "N/A"
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  } catch {
    return "N/A"
  }
}

// Format duration from minutes
function formatDuration(minutes: number | undefined | null): string {
  if (!minutes) return "N/A"
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  return `${hours}h ${mins}m`
}

// Segment card component
function SegmentCard({ segment, isLast }: { segment: SegmentData; isLast: boolean }) {
  return (
    <div className="relative">
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Times and airports */}
          <div className="flex-1">
            <div className="flex items-center gap-6">
              {/* Departure */}
              <div className="text-center min-w-[80px]">
                <p className="text-2xl font-bold text-gray-900">{formatTime(segment.departure_time)}</p>
                <p className="text-lg font-semibold text-blue-600">{segment.departure_airport}</p>
                {segment.departure_airport_name && (
                  <p className="text-xs text-gray-500 truncate max-w-[100px]">{segment.departure_airport_name}</p>
                )}
                {segment.departure_terminal && (
                  <p className="text-xs text-gray-400">Terminal {segment.departure_terminal}</p>
                )}
              </div>

              {/* Arrow with duration */}
              <div className="flex-1 flex flex-col items-center px-2">
                <p className="text-xs text-gray-500 mb-1">{formatDuration(segment.duration_minutes)}</p>
                <div className="flex items-center w-full">
                  <div className="h-0.5 flex-1 bg-gray-300" />
                  <Plane className="h-4 w-4 text-blue-500 mx-1" />
                  <div className="h-0.5 flex-1 bg-gray-300" />
                </div>
                {segment.overnight && (
                  <div className="flex items-center gap-1 mt-1 text-amber-600">
                    <Moon className="h-3 w-3" />
                    <span className="text-xs">Overnight</span>
                  </div>
                )}
              </div>

              {/* Arrival */}
              <div className="text-center min-w-[80px]">
                <p className="text-2xl font-bold text-gray-900">{formatTime(segment.arrival_time)}</p>
                <p className="text-lg font-semibold text-blue-600">{segment.arrival_airport}</p>
                {segment.arrival_airport_name && (
                  <p className="text-xs text-gray-500 truncate max-w-[100px]">{segment.arrival_airport_name}</p>
                )}
                {segment.arrival_terminal && (
                  <p className="text-xs text-gray-400">Terminal {segment.arrival_terminal}</p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Flight info */}
          <div className="text-right space-y-1 min-w-[120px]">
            <div className="flex items-center justify-end gap-2">
              {segment.airline_logo && (
                <img src={segment.airline_logo} alt={segment.airline} className="h-6 w-6 object-contain" />
              )}
              <span className="font-medium text-gray-900">{segment.airline}</span>
            </div>
            <p className="text-sm text-gray-600">{segment.flight_number}</p>
            {segment.aircraft && (
              <p className="text-xs text-gray-500">{segment.aircraft}</p>
            )}
            {segment.cabin_class && (
              <Badge variant="outline" className="text-xs">{segment.cabin_class}</Badge>
            )}
          </div>
        </div>

        {/* Additional info row */}
        {(segment.often_delayed || segment.legroom || (segment.extensions && segment.extensions.length > 0)) && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
            {segment.often_delayed && (
              <div className="flex items-center gap-1 text-amber-600 text-xs">
                <AlertTriangle className="h-3 w-3" />
                <span>Often delayed 30+ min</span>
              </div>
            )}
            {segment.legroom && (
              <div className="flex items-center gap-1 text-gray-600 text-xs">
                <Users className="h-3 w-3" />
                <span>{segment.legroom}</span>
              </div>
            )}
            {segment.extensions && segment.extensions.map((ext, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{ext}</Badge>
            ))}
          </div>
        )}
      </div>

      {/* Connection line to next segment */}
      {!isLast && (
        <div className="absolute left-1/2 -translate-x-1/2 h-4 w-0.5 bg-gray-300" />
      )}
    </div>
  )
}

// Layover card component
function LayoverCard({ layover }: { layover: LayoverData }) {
  return (
    <div className="flex items-center justify-center py-2">
      <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-full px-4 py-2">
        <CircleDot className="h-4 w-4 text-orange-500" />
        <div className="text-sm">
          <span className="font-medium text-gray-900">
            {formatDuration(layover.duration_minutes)} layover
          </span>
          <span className="text-gray-600"> in </span>
          <span className="font-medium text-gray-900">
            {layover.airport_name || layover.airport}
          </span>
        </div>
        {layover.overnight && (
          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
            <Moon className="h-3 w-3 mr-1" />
            Overnight
          </Badge>
        )}
      </div>
    </div>
  )
}

// Flight leg section component (for outbound or return)
function FlightLegSection({
  title,
  icon: Icon,
  date,
  segments,
  layovers,
  origin,
  destination,
  departureTime,
  arrivalTime,
  duration,
  numStops,
  colorClass = "blue",
}: {
  title: string
  icon: React.ElementType
  date: string | null | undefined
  segments: SegmentData[]
  layovers: LayoverData[]
  origin: string
  destination: string
  departureTime?: string
  arrivalTime?: string
  duration?: string
  numStops?: number
  colorClass?: "blue" | "purple"
}) {
  const bgColor = colorClass === "blue" ? "bg-blue-50" : "bg-purple-50"
  const borderColor = colorClass === "blue" ? "border-blue-200" : "border-purple-200"
  const textColor = colorClass === "blue" ? "text-blue-600" : "text-purple-600"
  const iconBg = colorClass === "blue" ? "bg-blue-500" : "bg-purple-500"

  // Interleave segments with layovers
  const renderSegmentsAndLayovers = () => {
    const elements: React.ReactNode[] = []
    
    segments.forEach((segment, index) => {
      elements.push(
        <SegmentCard 
          key={`segment-${index}`} 
          segment={segment} 
          isLast={index === segments.length - 1}
        />
      )
      
      // Add layover after this segment if there is one
      if (index < layovers.length) {
        elements.push(
          <LayoverCard key={`layover-${index}`} layover={layovers[index]} />
        )
      }
    })
    
    return elements
  }

  return (
    <div className={`rounded-xl ${bgColor} ${borderColor} border p-4`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg ${iconBg} flex items-center justify-center`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">{formatDate(date)}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">{origin}</span>
            <ArrowRight className={`h-4 w-4 ${textColor}`} />
            <span className="text-lg font-bold text-gray-900">{destination}</span>
          </div>
          <div className="flex items-center gap-2 justify-end text-sm text-gray-600">
            {duration && <span>{duration}</span>}
            {numStops !== undefined && (
              <Badge variant="outline" className="text-xs">
                {numStops === 0 ? "Direct" : `${numStops} stop${numStops > 1 ? "s" : ""}`}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Segments */}
      {segments.length > 0 ? (
        <div className="space-y-0">
          {renderSegmentsAndLayovers()}
        </div>
      ) : (
        // Fallback when no detailed segments available
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">{departureTime || "--:--"}</p>
              <p className="text-lg font-semibold text-blue-600">{origin}</p>
            </div>
            <div className="flex flex-col items-center px-4">
              <div className="flex items-center w-24">
                <div className="h-0.5 flex-1 bg-gray-300" />
                <Plane className="h-4 w-4 text-blue-500 mx-1" />
                <div className="h-0.5 flex-1 bg-gray-300" />
              </div>
              <p className="text-xs text-gray-500 mt-1">{duration || "N/A"}</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">{arrivalTime || "--:--"}</p>
              <p className="text-lg font-semibold text-blue-600">{destination}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function FlightDetailsModal({
  flight,
  open,
  onOpenChange,
}: FlightDetailsModalProps) {
  if (!flight) return null

  const details: FlightDetailsData | null = flight.flight_details || null
  const outboundSegments = details?.outbound_segments || []
  const returnSegments = details?.return_segments || []
  const outboundLayovers = details?.layover_details || []
  const returnLayovers: LayoverData[] = [] // Return layovers would be separate in full implementation
  
  // Calculate outbound stops
  const outboundStops = outboundSegments.length > 0 ? outboundSegments.length - 1 : (flight.layovers || 0)
  // For return, assume same number of stops if no detailed data
  const returnStops = returnSegments.length > 0 ? returnSegments.length - 1 : outboundStops
  
  const priceDropped = flight.old_price && flight.price < flight.old_price
  const priceDropPercent = priceDropped
    ? (((flight.old_price! - flight.price) / flight.old_price!) * 100).toFixed(0)
    : null

  const bookingUrl = flight.deal_url || flight.referral_link || flight.booking_link
  
  const isRoundTrip = !!flight.return_date

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden bg-white">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Flight Details
            {isRoundTrip && (
              <Badge className="bg-white/20 text-white ml-2">Round Trip</Badge>
            )}
          </DialogTitle>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3">
              <div className="text-center">
                <p className="text-3xl font-bold">{flight.origin}</p>
              </div>
              <div className="flex flex-col items-center px-4">
                {isRoundTrip ? (
                  <RotateCcw className="h-5 w-5 text-blue-200" />
                ) : (
                  <ArrowRight className="h-5 w-5 text-blue-200" />
                )}
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{flight.destination}</p>
              </div>
            </div>
            <div className="text-right">
              {priceDropped && flight.old_price && (
                <p className="text-sm line-through text-blue-200">€{flight.old_price.toLocaleString()}</p>
              )}
              <p className="text-3xl font-black">€{flight.price.toLocaleString()}</p>
              {priceDropped && (
                <Badge className="bg-emerald-500 text-white mt-1">
                  -{priceDropPercent}% off
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable content */}
        <ScrollArea className="max-h-[calc(90vh-240px)]">
          <div className="px-6 py-5 space-y-6 bg-white">
            
            {/* Outbound Flight */}
            <FlightLegSection
              title="Outbound Flight"
              icon={Plane}
              date={flight.departure_date}
              segments={outboundSegments}
              layovers={outboundLayovers}
              origin={flight.origin}
              destination={flight.destination}
              departureTime={details?.outbound_departure_time ? formatTime(details.outbound_departure_time) : undefined}
              arrivalTime={details?.outbound_arrival_time ? formatTime(details.outbound_arrival_time) : undefined}
              duration={flight.flight_duration}
              numStops={outboundStops}
              colorClass="blue"
            />

            {/* Return Flight */}
            {isRoundTrip && (
              <FlightLegSection
                title="Return Flight"
                icon={RotateCcw}
                date={flight.return_date}
                segments={returnSegments}
                layovers={returnLayovers}
                origin={flight.destination}
                destination={flight.origin}
                departureTime={details?.return_departure_time ? formatTime(details.return_departure_time) : undefined}
                arrivalTime={details?.return_arrival_time ? formatTime(details.return_arrival_time) : undefined}
                duration={flight.flight_duration} // Ideally would be separate return duration
                numStops={returnStops}
                colorClass="purple"
              />
            )}

            <Separator />

            {/* Details Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Flight Information */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  Flight Information
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  {flight.airline && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Airline</span>
                      <span className="font-medium text-gray-900">{flight.airline}</span>
                    </div>
                  )}
                  {details?.flight_numbers && details.flight_numbers.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Flight Numbers</span>
                      <span className="font-medium text-gray-900">{details.flight_numbers.join(", ")}</span>
                    </div>
                  )}
                  {details?.aircraft_type && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Aircraft</span>
                      <span className="font-medium text-gray-900">{details.aircraft_type}</span>
                    </div>
                  )}
                  {details?.cabin_class && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cabin Class</span>
                      <span className="font-medium text-gray-900">{details.cabin_class}</span>
                    </div>
                  )}
                  {details?.operating_carrier && details.operating_carrier !== flight.airline && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Operated by</span>
                      <span className="font-medium text-gray-900">{details.operating_carrier}</span>
                    </div>
                  )}
                  {flight.flight_duration && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Duration</span>
                      <span className="font-medium text-gray-900">{flight.flight_duration}</span>
                    </div>
                  )}
                  {details?.overnight && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Overnight Flight</span>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        <Moon className="h-3 w-3 mr-1" />
                        Yes
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing & Baggage */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-500" />
                  Pricing & Baggage
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Price</span>
                    <span className="font-bold text-blue-600 text-lg">
                      €{flight.price.toLocaleString()}
                    </span>
                  </div>
                  {details?.base_fare && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base Fare</span>
                      <span className="font-medium text-gray-900">€{details.base_fare.toLocaleString()}</span>
                    </div>
                  )}
                  {details?.taxes && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Taxes & Fees</span>
                      <span className="font-medium text-gray-900">€{details.taxes.toLocaleString()}</span>
                    </div>
                  )}
                  
                  <Separator className="my-2" />
                  
                  {/* Baggage */}
                  <div className="flex items-center gap-2 text-gray-600 pt-1">
                    <Luggage className="h-4 w-4" />
                    <span className="font-medium">Baggage</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cabin Bag</span>
                    <span className="font-medium text-gray-900">
                      {flight.baggage_info?.cabin || "Included"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Checked Bag</span>
                    <span className="font-medium text-gray-900">
                      {flight.baggage_info?.checked || "Check policy"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Source & Last Checked */}
            <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
              <div className="flex items-center gap-2">
                {flight.provider && (
                  <Badge variant="secondary" className="text-xs">
                    via {flight.provider}
                  </Badge>
                )}
                {flight.source && flight.source !== flight.provider && (
                  <Badge variant="outline" className="text-xs">
                    {flight.source}
                  </Badge>
                )}
              </div>
              <span>
                {flight.verified_at
                  ? `Verified: ${new Date(flight.verified_at).toLocaleString()}`
                  : `Last checked: ${new Date(flight.last_checked).toLocaleString()}`}
              </span>
            </div>
          </div>
        </ScrollArea>

        {/* Footer with booking button */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              <p className="font-medium">{flight.airline || "Multiple Airlines"}</p>
              <p className="text-xs">
                {flight.origin} → {flight.destination}
                {isRoundTrip && ` → ${flight.origin}`}
              </p>
            </div>
            {bookingUrl && (
              <a
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0"
              >
                <Button size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg">
                  Book Now — €{flight.price.toLocaleString()}
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

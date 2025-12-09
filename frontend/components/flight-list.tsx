"use client"

import { useState, useEffect } from "react"
import FlightCard from "@/components/flight-card"
import FlightSort from "@/components/flight-sort"
import FlightDetailsModal from "@/components/flight-details-modal"
import type { Flight } from "@/lib/types"

interface FlightListProps {
  flights: Flight[]
}

export default function FlightList({ flights: initialFlights }: FlightListProps) {
  const [sortedFlights, setSortedFlights] = useState<Flight[]>(initialFlights)
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Update sorted flights when initial flights change
  useEffect(() => {
    // Default sort by price (ascending)
    const sorted = [...initialFlights].sort((a, b) => (a.price || 0) - (b.price || 0))
    setSortedFlights(sorted)
  }, [initialFlights])

  const handleFlightClick = (flight: Flight) => {
    setSelectedFlight(flight)
    setIsModalOpen(true)
  }

  const handleModalClose = (open: boolean) => {
    setIsModalOpen(open)
    if (!open) {
      // Small delay before clearing selection for smooth animation
      setTimeout(() => setSelectedFlight(null), 200)
    }
  }

  return (
    <>
      {initialFlights.length > 0 && (
        <div className="mb-6">
          <FlightSort flights={initialFlights} onSortChange={setSortedFlights} />
        </div>
      )}
      <div className="space-y-4">
        {sortedFlights.map((flight) => (
          <FlightCard 
            key={flight.id} 
            flight={flight} 
            onClick={() => handleFlightClick(flight)}
          />
        ))}
      </div>

      {/* Flight Details Modal */}
      <FlightDetailsModal
        flight={selectedFlight}
        open={isModalOpen}
        onOpenChange={handleModalClose}
      />
    </>
  )
}

"use client"

import { useState, useEffect } from "react"
import FlightCard from "@/components/flight-card"
import FlightSort from "@/components/flight-sort"
import type { Flight } from "@/lib/types"

interface FlightListProps {
  flights: Flight[]
}

export default function FlightList({ flights: initialFlights }: FlightListProps) {
  const [sortedFlights, setSortedFlights] = useState<Flight[]>(initialFlights)

  // Update sorted flights when initial flights change
  useEffect(() => {
    // Default sort by price (ascending)
    const sorted = [...initialFlights].sort((a, b) => (a.price || 0) - (b.price || 0))
    setSortedFlights(sorted)
  }, [initialFlights])

  return (
    <>
      {initialFlights.length > 0 && (
        <div className="mb-6">
          <FlightSort flights={initialFlights} onSortChange={setSortedFlights} />
        </div>
      )}
      <div className="space-y-4">
        {sortedFlights.map((flight) => (
          <FlightCard key={flight.id} flight={flight} />
        ))}
      </div>
    </>
  )
}




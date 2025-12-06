"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowUp, ArrowDown } from "lucide-react"
import type { Flight } from "@/lib/types"

export type SortOption = "price" | "destination" | "departure_date" | "return_date"
export type SortDirection = "asc" | "desc"

interface FlightSortProps {
  flights: Flight[]
  onSortChange: (sortedFlights: Flight[]) => void
}

export default function FlightSort({ flights, onSortChange }: FlightSortProps) {
  const [sortBy, setSortBy] = useState<SortOption>("price")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  const sortFlights = (option: SortOption, direction: SortDirection) => {
    const sorted = [...flights].sort((a, b) => {
      let comparison = 0

      switch (option) {
        case "price":
          comparison = (a.price || 0) - (b.price || 0)
          break
        case "destination":
          comparison = (a.destination || "").localeCompare(b.destination || "")
          break
        case "departure_date":
          comparison =
            new Date(a.departure_date || "").getTime() -
            new Date(b.departure_date || "").getTime()
          break
        case "return_date":
          const aReturn = a.return_date ? new Date(a.return_date).getTime() : 0
          const bReturn = b.return_date ? new Date(b.return_date).getTime() : 0
          comparison = aReturn - bReturn
          break
      }

      return direction === "asc" ? comparison : -comparison
    })

    onSortChange(sorted)
  }

  // Re-sort when flights change (but keep current sort option)
  useEffect(() => {
    sortFlights(sortBy, sortDirection)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flights.length])

  const handleSortOptionChange = (newSortBy: SortOption) => {
    // If clicking the same sort option, toggle direction
    if (newSortBy === sortBy) {
      const newDirection: SortDirection = sortDirection === "asc" ? "desc" : "asc"
      setSortDirection(newDirection)
      sortFlights(newSortBy, newDirection)
    } else {
      // New sort option, default to ascending
      setSortBy(newSortBy)
      setSortDirection("asc")
      sortFlights(newSortBy, "asc")
    }
  }

  const handleDirectionToggle = () => {
    const newDirection: SortDirection = sortDirection === "asc" ? "desc" : "asc"
    setSortDirection(newDirection)
    sortFlights(sortBy, newDirection)
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-sm text-gray-600 font-medium">Sort by:</span>
      <div className="flex items-center gap-2">
        <Select value={sortBy} onValueChange={handleSortOptionChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="price">Price</SelectItem>
            <SelectItem value="destination">Destination</SelectItem>
            <SelectItem value="departure_date">Departure Date</SelectItem>
            <SelectItem value="return_date">Return Date</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDirectionToggle}
          className="flex items-center gap-2"
        >
          {sortDirection === "asc" ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )}
          {sortDirection === "asc" ? "Ascending" : "Descending"}
        </Button>
      </div>
    </div>
  )
}


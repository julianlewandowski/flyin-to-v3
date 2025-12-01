"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface SearchFlightsButtonProps {
  holidayId: string
}

export default function SearchFlightsButton({ holidayId }: SearchFlightsButtonProps) {
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSearch = async () => {
    setIsSearching(true)
    setError(null)

    try {
      const response = await fetch(`/api/holidays/${holidayId}/search-flights`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to search flights")
      }

      // Refresh the page to show new flights
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search flights")
      console.error("[v0] Search error:", err)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button onClick={handleSearch} disabled={isSearching}>
        {isSearching ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Searching...
          </>
        ) : (
          "Search Flights"
        )}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

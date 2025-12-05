"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { X, Sparkles } from "lucide-react"
import { AirportAutocomplete } from "@/components/airport-autocomplete"

// Using Next.js API routes - no backend needed

interface CreateHolidayFormProps {
  userId: string
}

export default function CreateHolidayForm({ userId }: CreateHolidayFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [origins, setOrigins] = useState<string[]>([""])
  const [useAiDiscovery, setUseAiDiscovery] = useState(false)
  const [destinations, setDestinations] = useState<string[]>([""])
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [tripDurationMin, setTripDurationMin] = useState("7")
  const [tripDurationMax, setTripDurationMax] = useState("14")
  const [budget, setBudget] = useState("")
  const [preferredWeekdays, setPreferredWeekdays] = useState<string[]>([])
  const [maxLayovers, setMaxLayovers] = useState("2")

  const addOrigin = () => {
    setOrigins([...origins, ""])
  }

  const removeOrigin = (index: number) => {
    setOrigins(origins.filter((_, i) => i !== index))
  }

  const updateOrigin = (index: number, value: string) => {
    const newOrigins = [...origins]
    newOrigins[index] = value
    setOrigins(newOrigins)
  }

  const addDestination = () => {
    setDestinations([...destinations, ""])
  }

  const removeDestination = (index: number) => {
    setDestinations(destinations.filter((_, i) => i !== index))
  }

  const updateDestination = (index: number, value: string) => {
    const newDestinations = [...destinations]
    newDestinations[index] = value
    setDestinations(newDestinations)
  }

  const toggleWeekday = (day: string) => {
    setPreferredWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const validOrigins = origins.filter((o) => o.trim() !== "")
    if (validOrigins.length === 0) {
      setError("Please add at least one origin airport")
      setIsLoading(false)
      return
    }

    const validDestinations = destinations.filter((d) => d.trim() !== "")
    if (!useAiDiscovery && validDestinations.length === 0) {
      setError("Please add at least one destination or enable AI discovery")
      setIsLoading(false)
      return
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setError("End date must be after start date")
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()

      const { data, error: insertError } = await supabase
        .from("holidays")
        .insert({
          user_id: userId,
          name,
          origin: validOrigins[0], // Keep for backward compatibility
          origins: validOrigins,
          destinations: useAiDiscovery ? [] : validDestinations,
          start_date: startDate,
          end_date: endDate,
          trip_duration_min: Number.parseInt(tripDurationMin),
          trip_duration_max: Number.parseInt(tripDurationMax),
          budget: budget ? Number.parseFloat(budget) : null,
          preferred_weekdays: preferredWeekdays.length > 0 ? preferredWeekdays : null,
          max_layovers: Number.parseInt(maxLayovers),
          use_ai_discovery: useAiDiscovery,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Automatically trigger unified flight search and insights generation
      try {
        // Step 1: Trigger unified flight search (await to ensure it completes)
        console.log("[Create Holiday] Starting automatic flight search...")
        const searchResponse = await fetch(`/api/holidays/${data.id}/search-flights-unified`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        })
        
        const searchData = await searchResponse.json()
        console.log("[Create Holiday] Auto-search response:", searchData)
        
        if (searchResponse.ok && searchData.success) {
          // Wait for flights to be saved to database
          if (searchData.metadata?.saved_to_db > 0) {
            console.log(`[Create Holiday] Saved ${searchData.metadata.saved_to_db} flights, waiting for database...`)
            // Wait longer to ensure database is ready
            await new Promise((resolve) => setTimeout(resolve, 3000))
          }
          
          // Step 2: Generate insights (only if flights were found)
          try {
            await fetch(`/api/holidays/${data.id}/generate-insights`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
            })
          } catch (insightsError) {
            // Insights generation is optional, don't fail the whole flow
            console.warn("Failed to generate insights automatically:", insightsError)
          }
        } else {
          console.warn("[Create Holiday] Search completed but no flights found:", searchData.message)
        }
      } catch (autoSearchError) {
        // Auto-search is best-effort, don't fail the holiday creation
        // User can manually trigger search from the dashboard if needed
        console.warn("Failed to automatically search flights:", autoSearchError)
      }

      // Redirect to dashboard - page will auto-refresh to show results
      router.push(`/dashboard/holidays/${data.id}`)
      // Force a refresh after navigation to ensure flights are loaded
      setTimeout(() => {
        router.refresh()
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create holiday")
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Holiday Details</CardTitle>
        <CardDescription>Tell us about your travel plans</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Holiday Name</Label>
            <Input
              id="name"
              placeholder="e.g., Summer Europe Trip"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Origin Airports</Label>
            {origins.map((origin, index) => (
              <div key={index} className="flex gap-2">
                <AirportAutocomplete
                  value={origin}
                  onChange={(value) => updateOrigin(index, value)}
                  placeholder="Search origin airport..."
                  className="flex-1"
                />
                {origins.length > 1 && (
                  <Button type="button" variant="outline" size="icon" onClick={() => removeOrigin(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addOrigin} className="w-full bg-transparent">
              Add Another Origin
            </Button>
            <p className="text-xs text-muted-foreground">Add multiple departure airports for more flexibility</p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <Label htmlFor="ai-discovery" className="text-base font-medium">
                  AI Destination Discovery
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">Let AI suggest the best destinations for your budget</p>
            </div>
            <Switch id="ai-discovery" checked={useAiDiscovery} onCheckedChange={setUseAiDiscovery} />
          </div>

          {!useAiDiscovery && (
            <div className="space-y-2">
              <Label>Destination Airports</Label>
              {destinations.map((destination, index) => (
                <div key={index} className="flex gap-2">
                  <AirportAutocomplete
                    value={destination}
                    onChange={(value) => updateDestination(index, value)}
                    placeholder="Search destination airport..."
                    className="flex-1"
                  />
                  {destinations.length > 1 && (
                    <Button type="button" variant="outline" size="icon" onClick={() => removeDestination(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addDestination} className="w-full bg-transparent">
                Add Another Destination
              </Button>
              <p className="text-xs text-muted-foreground">We'll track prices to all these destinations</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration-min">Min Trip Duration (days)</Label>
              <Input
                id="duration-min"
                type="number"
                value={tripDurationMin}
                onChange={(e) => setTripDurationMin(e.target.value)}
                min="1"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration-max">Max Trip Duration (days)</Label>
              <Input
                id="duration-max"
                type="number"
                value={tripDurationMax}
                onChange={(e) => setTripDurationMax(e.target.value)}
                min="1"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget">Budget (Optional)</Label>
            <Input
              id="budget"
              type="number"
              placeholder="e.g., 1000"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              min="0"
              step="0.01"
            />
            <p className="text-xs text-muted-foreground">Set a maximum budget to filter flight results</p>
          </div>

          <div className="space-y-2">
            <Label>Preferred Departure Days (Optional)</Label>
            <div className="flex flex-wrap gap-2">
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                <Button
                  key={day}
                  type="button"
                  variant={preferredWeekdays.includes(day) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleWeekday(day)}
                >
                  {day.slice(0, 3)}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Select days you prefer to depart on</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="layovers">Max Layovers</Label>
            <Input
              id="layovers"
              type="number"
              value={maxLayovers}
              onChange={(e) => setMaxLayovers(e.target.value)}
              min="0"
              max="3"
              required
            />
            <p className="text-xs text-muted-foreground">Maximum number of stops you're willing to make</p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                  Creating holiday and searching flights...
                </>
              ) : (
                "Create Holiday"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/dashboard")} disabled={isLoading}>
              Cancel
            </Button>
          </div>
          {isLoading && (
            <p className="text-sm text-muted-foreground text-center">
              This may take a moment while we search for flights and generate insights...
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { X, Sparkles } from "lucide-react"
import { AirportAutocomplete } from "@/components/airport-autocomplete"
import type { Holiday } from "@/lib/types"

interface EditHolidayFormProps {
  holiday: Holiday
}

export default function EditHolidayForm({ holiday }: EditHolidayFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(holiday.name || "")
  const [origins, setOrigins] = useState<string[]>(
    holiday.origins && holiday.origins.length > 0 ? holiday.origins : [holiday.origin || ""]
  )
  const [useAiDiscovery, setUseAiDiscovery] = useState(holiday.use_ai_discovery || false)
  const [destinations, setDestinations] = useState<string[]>(
    holiday.destinations && holiday.destinations.length > 0 ? holiday.destinations : [""]
  )
  // Format dates for date input (YYYY-MM-DD)
  const formatDateForInput = (dateString: string | undefined): string => {
    if (!dateString) return ""
    // If it's already YYYY-MM-DD, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString
    // Otherwise, extract YYYY-MM-DD from ISO string
    return dateString.split("T")[0]
  }

  const [startDate, setStartDate] = useState(formatDateForInput(holiday.start_date))
  const [endDate, setEndDate] = useState(formatDateForInput(holiday.end_date))
  const [tripDurationMin, setTripDurationMin] = useState(String(holiday.trip_duration_min || 7))
  const [tripDurationMax, setTripDurationMax] = useState(String(holiday.trip_duration_max || 14))
  const [budget, setBudget] = useState(holiday.budget ? String(holiday.budget) : "")
  const [preferredWeekdays, setPreferredWeekdays] = useState<string[]>(holiday.preferred_weekdays || [])
  const [maxLayovers, setMaxLayovers] = useState(String(holiday.max_layovers || 2))

  // Ensure at least one origin exists
  useEffect(() => {
    if (origins.length === 0 || origins.every((o) => o.trim() === "")) {
      setOrigins([holiday.origin || ""])
    }
  }, [])

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

      const { error: updateError } = await supabase
        .from("holidays")
        .update({
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
          updated_at: new Date().toISOString(),
        })
        .eq("id", holiday.id)

      if (updateError) throw updateError

      // Redirect back to holiday detail page
      router.push(`/dashboard/holidays/${holiday.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update holiday")
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Holiday Details</CardTitle>
        <CardDescription>Update your travel preferences and parameters</CardDescription>
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
              {isLoading ? "Saving changes..." : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/dashboard/holidays/${holiday.id}`)}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}


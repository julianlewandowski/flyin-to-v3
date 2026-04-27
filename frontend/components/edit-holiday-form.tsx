"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sparkles, Loader2, Plane, Calendar, Wallet, Clock, MapPin } from "lucide-react"
import { AirportMultiSelect } from "@/components/airport-multi-select"
import { AiDestinationSuggester } from "@/components/ai-destination-suggester"
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
    holiday.origins && holiday.origins.length > 0
      ? holiday.origins
      : holiday.origin
        ? [holiday.origin]
        : []
  )
  const [destinations, setDestinations] = useState<string[]>(
    holiday.destinations && holiday.destinations.length > 0 ? holiday.destinations : []
  )
  const [aiAddedIatas, setAiAddedIatas] = useState<string[]>([])
  const [usedAi, setUsedAi] = useState(holiday.use_ai_discovery || false)

  // Format dates for date input (YYYY-MM-DD)
  const formatDateForInput = (dateString: string | undefined): string => {
    if (!dateString) return ""
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString
    return dateString.split("T")[0]
  }

  const [startDate, setStartDate] = useState(formatDateForInput(holiday.start_date))
  const [endDate, setEndDate] = useState(formatDateForInput(holiday.end_date))
  const [tripDurationMin, setTripDurationMin] = useState(String(holiday.trip_duration_min || 7))
  const [tripDurationMax, setTripDurationMax] = useState(String(holiday.trip_duration_max || 14))
  const [budget, setBudget] = useState(holiday.budget ? String(holiday.budget) : "")
  const [preferredWeekdays, setPreferredWeekdays] = useState<string[]>(holiday.preferred_weekdays || [])
  const [maxLayovers, setMaxLayovers] = useState(String(holiday.max_layovers || 2))

  const toggleWeekday = (day: string) => {
    setPreferredWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  const handleAddAiSuggestion = (iata: string) => {
    if (!destinations.includes(iata)) {
      setDestinations([...destinations, iata])
      setAiAddedIatas((prev) => (prev.includes(iata) ? prev : [...prev, iata]))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (origins.length === 0) {
      setError("Please add at least one origin airport")
      setIsLoading(false)
      return
    }

    if (destinations.length === 0) {
      setError("Please add at least one destination — search above or ask AI for ideas")
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
          origin: origins[0], // Keep for backward compatibility
          origins,
          destinations,
          start_date: startDate,
          end_date: endDate,
          trip_duration_min: Number.parseInt(tripDurationMin),
          trip_duration_max: Number.parseInt(tripDurationMax),
          budget: budget ? Number.parseFloat(budget) : null,
          preferred_weekdays: preferredWeekdays.length > 0 ? preferredWeekdays : null,
          max_layovers: Number.parseInt(maxLayovers),
          use_ai_discovery: usedAi,
          updated_at: new Date().toISOString(),
        })
        .eq("id", holiday.id)

      if (updateError) throw updateError

      router.push(`/dashboard/holidays/${holiday.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update holiday")
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-border shadow-xl">
      <CardHeader className="pb-8 border-b border-border/50">
        <CardTitle className="text-2xl font-bold">Edit Holiday Details</CardTitle>
        <CardDescription>Update your travel preferences and parameters</CardDescription>
      </CardHeader>
      <CardContent className="pt-8">
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Holiday Name */}
          <div className="space-y-3">
            <Label htmlFor="name" className="text-base font-semibold">Holiday Name</Label>
            <Input
              id="name"
              placeholder="e.g., Summer Europe Trip 2025"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-12 text-lg"
            />
          </div>

          {/* Origins */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Plane className="h-4 w-4 text-primary rotate-90" />
              <Label className="text-base font-semibold">Flying from</Label>
            </div>
            <AirportMultiSelect
              values={origins}
              onChange={setOrigins}
              placeholder="Search by city, airport, or code…"
              emptyHint="Add one or more airports you can leave from."
            />
            {origins.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Adding multiple departure airports gives us more flexibility to find deals.
              </p>
            )}
          </div>

          {/* Destinations */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <Label className="text-base font-semibold">Flying to</Label>
            </div>
            <AirportMultiSelect
              values={destinations}
              onChange={(next) => {
                setDestinations(next)
                setAiAddedIatas((prev) => prev.filter((i) => next.includes(i)))
              }}
              placeholder="Search destinations, or ask AI below for ideas…"
              emptyHint="Add destinations directly, or use AI suggestions below."
              highlightedIatas={aiAddedIatas}
            />

            <AiDestinationSuggester
              origins={origins}
              startDate={startDate}
              endDate={endDate}
              tripDurationMin={tripDurationMin}
              tripDurationMax={tripDurationMax}
              budget={budget}
              preferredWeekdays={preferredWeekdays}
              maxLayovers={maxLayovers}
              selectedIatas={destinations}
              onAdd={handleAddAiSuggestion}
              onMarkAiUsed={() => setUsedAi(true)}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <Label htmlFor="start-date" className="font-semibold">Earliest departure</Label>
              </div>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <Label htmlFor="end-date" className="font-semibold">Latest return</Label>
              </div>
              <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required className="h-11" />
            </div>
          </div>

          {/* Duration */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <Label htmlFor="duration-min" className="font-semibold">Min Days</Label>
              </div>
              <Input
                id="duration-min"
                type="number"
                value={tripDurationMin}
                onChange={(e) => setTripDurationMin(e.target.value)}
                min="1"
                required
                className="h-11"
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <Label htmlFor="duration-max" className="font-semibold">Max Days</Label>
              </div>
              <Input
                id="duration-max"
                type="number"
                value={tripDurationMax}
                onChange={(e) => setTripDurationMax(e.target.value)}
                min="1"
                required
                className="h-11"
              />
            </div>
          </div>

          {/* Budget */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              <Label htmlFor="budget" className="font-semibold">Budget (Optional)</Label>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
              <Input
                id="budget"
                type="number"
                placeholder="1000"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                min="0"
                step="0.01"
                className="h-11 pl-7"
              />
            </div>
            <p className="text-xs text-muted-foreground">Set a maximum budget to filter flight results</p>
          </div>

          {/* Preferred Days */}
          <div className="space-y-3">
            <Label className="font-semibold">Preferred Departure Days (Optional)</Label>
            <div className="flex flex-wrap gap-2">
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                <Button
                  key={day}
                  type="button"
                  variant={preferredWeekdays.includes(day) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleWeekday(day)}
                  className={`rounded-full transition-all ${preferredWeekdays.includes(day) ? "shadow-md" : "opacity-80 hover:opacity-100"}`}
                >
                  {day.slice(0, 3)}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Select days you prefer to depart on</p>
          </div>

          {/* Layovers */}
          <div className="space-y-3">
            <Label htmlFor="layovers" className="font-semibold">Max Layovers</Label>
            <Input
              id="layovers"
              type="number"
              value={maxLayovers}
              onChange={(e) => setMaxLayovers(e.target.value)}
              min="0"
              max="3"
              required
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">Maximum number of stops you're willing to make</p>
          </div>

          {error && <p className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-lg border border-destructive/20">{error}</p>}

          <div className="pt-6 border-t border-border flex flex-col-reverse sm:flex-row gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/dashboard/holidays/${holiday.id}`)}
              disabled={isLoading}
              className="flex-1 h-12"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1 h-12 text-lg shadow-lg shadow-primary/20">
              {isLoading ? (
                <>
                  <Sparkles className="h-5 w-5 mr-2 animate-pulse" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

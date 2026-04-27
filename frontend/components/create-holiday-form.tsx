"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Plane, Calendar, Wallet, Clock, MapPin } from "lucide-react"
import { AirportMultiSelect } from "@/components/airport-multi-select"
import { AiDestinationSuggester } from "@/components/ai-destination-suggester"

interface CreateHolidayFormProps {
  userId: string
}

export default function CreateHolidayForm({ userId }: CreateHolidayFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Default to a search window starting in 4 weeks, ending 10 weeks out — a common
  // sweet spot for fare deals and avoids the "set dates from scratch" friction.
  const today = new Date()
  const defaultStart = new Date(today.getTime() + 28 * 24 * 60 * 60 * 1000)
  const defaultEnd = new Date(today.getTime() + 70 * 24 * 60 * 60 * 1000)
  const toDateInput = (d: Date) => d.toISOString().slice(0, 10)

  const [name, setName] = useState("")
  const [origins, setOrigins] = useState<string[]>([])
  const [destinations, setDestinations] = useState<string[]>([])
  const [aiAddedIatas, setAiAddedIatas] = useState<string[]>([])
  const [usedAi, setUsedAi] = useState(false)
  const [startDate, setStartDate] = useState(toDateInput(defaultStart))
  const [endDate, setEndDate] = useState(toDateInput(defaultEnd))
  const [tripDurationMin, setTripDurationMin] = useState("7")
  const [tripDurationMax, setTripDurationMax] = useState("14")
  const [budget, setBudget] = useState("")
  const [preferredWeekdays, setPreferredWeekdays] = useState<string[]>([])
  const [maxLayovers, setMaxLayovers] = useState("2")

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

      const { data, error: insertError } = await supabase
        .from("holidays")
        .insert({
          user_id: userId,
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
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Redirect immediately. The detail page handles the flight search
      // asynchronously and shows live progress instead of blocking here.
      const flag = destinations.length > 0 ? "?creating=1" : ""
      router.push(`/dashboard/holidays/${data.id}${flag}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create holiday")
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-border shadow-xl">
      <CardHeader className="pb-8 border-b border-border/50">
        <CardTitle className="text-2xl font-bold">Trip details</CardTitle>
        <CardDescription>The more flexibility you give us, the better the deals we find.</CardDescription>
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
                // Keep the AI-tag list in sync if the user removes a chip
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
            <Button type="button" variant="outline" onClick={() => router.push("/dashboard")} disabled={isLoading} className="flex-1 h-12">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1 h-12 text-lg shadow-lg shadow-primary/20">
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Holiday"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

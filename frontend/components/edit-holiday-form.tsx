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
import { X, Sparkles, Loader2, Plane, Calendar, Wallet, Clock, Map } from "lucide-react"
import { AirportAutocomplete } from "@/components/airport-autocomplete"
import { DestinationDiscoveryModal } from "@/components/destination-discovery-modal"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import type { Holiday, DiscoveredDestination, DestinationDiscoveryInput } from "@/lib/types"

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
  const [aiDiscoveryPrompt, setAiDiscoveryPrompt] = useState("")
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

  // AI Discovery state
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [discoveredDestinations, setDiscoveredDestinations] = useState<DiscoveredDestination[]>([])
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false)

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

  const handleDiscoverDestinations = async () => {
    const validOrigins = origins.filter((o) => o.trim() !== "")
    if (validOrigins.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one origin airport first",
        variant: "destructive",
      })
      return
    }

    if (!startDate || !endDate) {
      toast({
        title: "Error",
        description: "Please select start and end dates first",
        variant: "destructive",
      })
      return
    }

    setIsDiscovering(true)
    setError(null)

    try {
      const input: DestinationDiscoveryInput = {
        origins: validOrigins,
        dateRange: {
          start: startDate,
          end: endDate,
        },
        tripLengths: {
          min: Number.parseInt(tripDurationMin),
          max: Number.parseInt(tripDurationMax),
        },
        preferences: {
          budget: budget ? Number.parseFloat(budget) : undefined,
          preferred_weekdays: preferredWeekdays.length > 0 ? preferredWeekdays : undefined,
          max_layovers: Number.parseInt(maxLayovers),
        },
        prompt: aiDiscoveryPrompt.trim() || undefined,
      }

      const response = await fetch("/api/ai/discover-destinations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Could not discover destinations")
      }

      const data = await response.json()
      setDiscoveredDestinations(data.destinations || [])
      setShowDiscoveryModal(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Could not discover destinations. Please try again."
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsDiscovering(false)
    }
  }

  const handleConfirmDestinations = (selectedAirports: string[]) => {
    setDestinations(selectedAirports)
    setShowDiscoveryModal(false)
    toast({
      title: "Destinations selected",
      description: `Selected ${selectedAirports.length} destination${selectedAirports.length !== 1 ? "s" : ""}`,
    })
  }

  // Reset destinations when toggling AI discovery off
  const handleToggleAiDiscovery = (checked: boolean) => {
    setUseAiDiscovery(checked)
    if (!checked) {
      setDestinations(holiday.destinations && holiday.destinations.length > 0 ? holiday.destinations : [""])
      setAiDiscoveryPrompt("")
      setDiscoveredDestinations([])
    }
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
    if (useAiDiscovery && validDestinations.length === 0) {
      setError("Please discover and select destinations using AI Discovery")
      setIsLoading(false)
      return
    }
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
          destinations: validDestinations, // Always save destinations, whether from AI discovery or manual input
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
          <div className="space-y-3 p-4 bg-secondary/20 rounded-xl border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Plane className="h-4 w-4 text-primary rotate-90" />
              <Label className="text-base font-semibold">Origin Airports</Label>
            </div>
            <div className="space-y-3">
              {origins.map((origin, index) => (
                <div key={index} className="flex gap-2">
                  <AirportAutocomplete
                    value={origin}
                    onChange={(value) => updateOrigin(index, value)}
                    placeholder="Search origin airport..."
                    className="flex-1 h-11"
                  />
                  {origins.length > 1 && (
                    <Button type="button" variant="outline" size="icon" onClick={() => removeOrigin(index)} className="h-11 w-11">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addOrigin} className="w-full bg-background/50 border-dashed border-border hover:bg-background hover:border-primary/50 text-muted-foreground hover:text-primary transition-all">
                + Add Another Origin
              </Button>
              <p className="text-xs text-muted-foreground">Add multiple departure airports for more flexibility</p>
            </div>
          </div>

          {/* AI Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <Label htmlFor="ai-discovery" className="text-base font-semibold text-foreground">
                  AI Destination Discovery
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">Let AI suggest the best destinations based on your prompt</p>
            </div>
            <Switch id="ai-discovery" checked={useAiDiscovery} onCheckedChange={handleToggleAiDiscovery} className="scale-110" />
          </div>

          {/* Destinations (AI or Manual) */}
          <div className="space-y-3 p-4 bg-secondary/20 rounded-xl border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Map className="h-4 w-4 text-primary" />
              <Label className="text-base font-semibold">Destinations</Label>
            </div>

            {useAiDiscovery ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ai-prompt" className="font-medium">Describe your ideal trip (optional)</Label>
                  <Textarea
                    id="ai-prompt"
                    placeholder="e.g., Beach vacation with good nightlife, cultural cities in Europe, adventure travel in Asia..."
                    value={aiDiscoveryPrompt}
                    onChange={(e) => setAiDiscoveryPrompt(e.target.value)}
                    rows={4}
                    className="resize-none bg-background text-base"
                  />
                  <p className="text-xs text-muted-foreground">
                    The more details you provide, the better recommendations we can give.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleDiscoverDestinations}
                  disabled={isDiscovering || !startDate || !endDate}
                  className="w-full h-12 text-base shadow-lg shadow-primary/20"
                >
                  {isDiscovering ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Discovering destinations...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Discover Destinations with AI
                    </>
                  )}
                </Button>

                {destinations.length > 0 && destinations[0] !== "" && (
                  <div className="space-y-2 pt-2">
                    <Label className="font-medium">Selected Destinations</Label>
                    <div className="flex flex-wrap gap-2">
                      {destinations.map((airport) => {
                        const dest = discoveredDestinations.find((d) => d.airport === airport)
                        return (
                          <Badge key={airport} variant="secondary" className="text-sm py-1.5 px-3 rounded-md bg-background border border-border">
                            {dest ? `${dest.city} (${airport})` : airport}
                          </Badge>
                        )
                      })}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDestinations([])
                        setDiscoveredDestinations([])
                      }}
                      className="text-muted-foreground hover:text-destructive text-xs"
                    >
                      Clear selection
                    </Button>
                  </div>
                )}

                {error && (destinations.length === 0 || destinations[0] === "") && (
                  <p className="text-sm text-destructive font-medium bg-destructive/10 p-2 rounded">{error}</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {destinations.map((destination, index) => (
                  <div key={index} className="flex gap-2">
                    <AirportAutocomplete
                      value={destination}
                      onChange={(value) => updateDestination(index, value)}
                      placeholder="Search destination airport..."
                      className="flex-1 h-11"
                    />
                    {destinations.length > 1 && (
                      <Button type="button" variant="outline" size="icon" onClick={() => removeDestination(index)} className="h-11 w-11">
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addDestination} className="w-full bg-background/50 border-dashed border-border hover:bg-background hover:border-primary/50 text-muted-foreground hover:text-primary transition-all">
                  + Add Another Destination
                </Button>
                <p className="text-xs text-muted-foreground">We'll track prices to all these destinations</p>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <Label htmlFor="start-date" className="font-semibold">Start Date</Label>
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
                <Label htmlFor="end-date" className="font-semibold">End Date</Label>
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

          {error && !useAiDiscovery && <p className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-lg border border-destructive/20">{error}</p>}

          <DestinationDiscoveryModal
            open={showDiscoveryModal}
            onOpenChange={setShowDiscoveryModal}
            destinations={discoveredDestinations}
            isLoading={isDiscovering}
            onConfirm={handleConfirmDestinations}
          />

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

"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X } from "lucide-react"

interface CreateHolidayFormProps {
  userId: string
}

export default function CreateHolidayForm({ userId }: CreateHolidayFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [origin, setOrigin] = useState("")
  const [destinations, setDestinations] = useState<string[]>([""])
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [budget, setBudget] = useState("")

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Validate
    const validDestinations = destinations.filter((d) => d.trim() !== "")
    if (validDestinations.length === 0) {
      setError("Please add at least one destination")
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
          origin: origin.trim(),
          destinations: validDestinations,
          start_date: startDate,
          end_date: endDate,
          budget: budget ? Number.parseFloat(budget) : null,
        })
        .select()
        .single()

      if (insertError) throw insertError

      router.push(`/dashboard/holidays/${data.id}`)
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
            <Label htmlFor="origin">Origin Airport</Label>
            <Input
              id="origin"
              placeholder="e.g., JFK, LHR, SYD"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">Enter the airport code where you'll be flying from</p>
          </div>

          <div className="space-y-2">
            <Label>Destination Airports</Label>
            {destinations.map((destination, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="e.g., CDG, FCO, BCN"
                  value={destination}
                  onChange={(e) => updateDestination(index, e.target.value)}
                  required
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

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Creating..." : "Create Holiday"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/dashboard")} disabled={isLoading}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

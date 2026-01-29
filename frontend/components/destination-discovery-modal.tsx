"use client"

import { useState } from "react"
import { Check, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { DiscoveredDestination } from "@/lib/types"

interface DestinationDiscoveryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  destinations: DiscoveredDestination[]
  isLoading?: boolean
  onConfirm: (selectedAirports: string[]) => void
}

export function DestinationDiscoveryModal({
  open,
  onOpenChange,
  destinations,
  isLoading = false,
  onConfirm,
}: DestinationDiscoveryModalProps) {
  const [selectedAirports, setSelectedAirports] = useState<Set<string>>(new Set())

  const toggleSelection = (airport: string) => {
    const newSelected = new Set(selectedAirports)
    if (newSelected.has(airport)) {
      newSelected.delete(airport)
    } else {
      if (newSelected.size < 3) {
        newSelected.add(airport)
      }
    }
    setSelectedAirports(newSelected)
  }

  const handleConfirm = () => {
    if (selectedAirports.size > 0) {
      onConfirm(Array.from(selectedAirports))
      setSelectedAirports(new Set())
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Destination Recommendations
          </DialogTitle>
          <DialogDescription>
            Select up to 3 destinations that interest you. We'll search for flights to these locations.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Discovering destinations...</p>
          </div>
        ) : destinations.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <p>No destinations found. Please try again.</p>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            {destinations.map((dest) => {
              const isSelected = selectedAirports.has(dest.airport)
              const canSelect = selectedAirports.size < 3 || isSelected

              return (
                <Card
                  key={dest.airport}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? "ring-2 ring-primary" : ""
                  } ${!canSelect ? "opacity-50 cursor-not-allowed" : ""}`}
                  onClick={() => canSelect && toggleSelection(dest.airport)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">
                            {dest.city}, {dest.country}
                          </h3>
                          <Badge variant="secondary" className="font-mono">
                            {dest.airport}
                          </Badge>
                          {isSelected && (
                            <Badge variant="default" className="ml-auto">
                              <Check className="h-3 w-3 mr-1" />
                              Selected
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{dest.reason}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-muted-foreground">
              {selectedAirports.size > 0
                ? `${selectedAirports.size} of 3 destinations selected`
                : "Select 1-3 destinations to continue"}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={selectedAirports.size === 0 || isLoading}>
                Confirm Destinations
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
















"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plane } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { searchAirports, formatAirport, formatAirportWithCity, type Airport } from "@/lib/airports"

interface AirportAutocompleteProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function AirportAutocomplete({
  value,
  onChange,
  placeholder = "Search airports...",
  className,
  disabled,
}: AirportAutocompleteProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedAirport, setSelectedAirport] = React.useState<Airport | null>(null)

  // Find selected airport from value (IATA code)
  React.useEffect(() => {
    if (value) {
      const airport = searchAirports(value).find((a) => a.iata === value)
      setSelectedAirport(airport || null)
    } else {
      setSelectedAirport(null)
    }
  }, [value])

  // Search airports based on query
  const searchResults = React.useMemo(() => {
    if (!searchQuery || searchQuery.trim().length === 0) {
      return []
    }
    return searchAirports(searchQuery).slice(0, 10) // Limit to 10 results
  }, [searchQuery])

  const handleSelect = (airport: Airport) => {
    setSelectedAirport(airport)
    onChange(airport.iata)
    setOpen(false)
    setSearchQuery("")
  }

  const displayValue = selectedAirport
    ? formatAirport(selectedAirport)
    : value || ""

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Plane className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {displayValue || placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 bg-card border shadow-lg backdrop-blur-none" align="start">
        <Command shouldFilter={false} className="bg-card rounded-md">
          <CommandInput
            placeholder="Search by airport name, city, or code..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="bg-card"
          />
          <CommandList className="bg-card">
            <CommandEmpty>
              {searchQuery ? `No airports found for "${searchQuery}"` : "Start typing to search airports..."}
            </CommandEmpty>
            {searchResults.length > 0 && (
              <CommandGroup heading="Airports">
                {searchResults.map((airport) => (
                  <CommandItem
                    key={airport.iata}
                    value={airport.iata}
                    onSelect={() => handleSelect(airport)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          selectedAirport?.iata === airport.iata ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-xs text-muted-foreground w-12 shrink-0">
                            {airport.iata}
                          </span>
                          <span className="font-medium truncate">{airport.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground truncate">
                          {airport.city}, {airport.country}
                        </span>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}


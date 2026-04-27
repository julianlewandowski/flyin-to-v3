"use client"

import * as React from "react"
import { X, Search, Plane } from "lucide-react"
import { cn } from "@/lib/utils"
import { searchAirports, getAirportByIata, type Airport } from "@/lib/airports"

interface AirportMultiSelectProps {
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  emptyHint?: string
  highlightedIatas?: string[]
}

export function AirportMultiSelect({
  values,
  onChange,
  placeholder = "Search by city, airport, or code…",
  emptyHint,
  highlightedIatas,
}: AirportMultiSelectProps) {
  const [query, setQuery] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const [activeIndex, setActiveIndex] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Render every selected IATA — if the DB contains a code we don't recognize,
  // fall back to a synthetic Airport so the user can still see and remove it.
  const selected = React.useMemo<Airport[]>(
    () =>
      values
        .filter((v) => v && v.trim() !== "")
        .map(
          (iata) =>
            getAirportByIata(iata) ?? {
              iata,
              name: iata,
              city: iata,
              country: "",
            }
        ),
    [values]
  )

  const results = React.useMemo(() => {
    const trimmed = query.trim()
    if (trimmed.length === 0) return []
    return searchAirports(trimmed)
      .filter((a) => !values.includes(a.iata))
      .slice(0, 8)
  }, [query, values])

  React.useEffect(() => {
    setActiveIndex(0)
  }, [query, results.length])

  React.useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open])

  const addAirport = (iata: string) => {
    if (values.includes(iata)) return
    onChange([...values, iata])
    setQuery("")
    setOpen(false)
    inputRef.current?.focus()
  }

  const removeAirport = (iata: string) => {
    onChange(values.filter((v) => v !== iata))
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setOpen(true)
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, results.length - 1)))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(0, i - 1))
    } else if (e.key === "Enter") {
      if (results.length > 0 && open) {
        e.preventDefault()
        addAirport(results[activeIndex].iata)
      }
    } else if (e.key === "Backspace" && query === "" && selected.length > 0) {
      removeAirport(selected[selected.length - 1].iata)
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 min-h-[3rem] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:border-primary"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {selected.map((airport) => {
          const highlighted = highlightedIatas?.includes(airport.iata)
          return (
            <span
              key={airport.iata}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border bg-secondary px-2 py-1 text-sm font-medium",
                highlighted
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-foreground"
              )}
            >
              <Plane className="h-3 w-3 shrink-0 opacity-60" />
              <span>
                {airport.city}
                <span className="ml-1 text-xs font-mono opacity-60">{airport.iata}</span>
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeAirport(airport.iata)
                }}
                className="rounded-sm opacity-50 hover:opacity-100 hover:text-destructive transition-opacity"
                aria-label={`Remove ${airport.city}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )
        })}
        <div className="flex flex-1 items-center min-w-[10rem] gap-2">
          {selected.length === 0 && <Search className="h-4 w-4 text-muted-foreground" />}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => query.trim().length > 0 && setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={selected.length === 0 ? placeholder : "Add another…"}
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground py-1"
          />
        </div>
      </div>

      {open && query.trim().length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
          {results.length === 0 ? (
            <div className="px-3 py-3 text-sm text-muted-foreground">
              No airports found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {results.map((airport, i) => (
                <li
                  key={airport.iata}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    addAirport(airport.iata)
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 cursor-pointer text-sm",
                    i === activeIndex ? "bg-accent" : "hover:bg-accent/50"
                  )}
                >
                  <span className="font-mono text-xs text-muted-foreground w-12 shrink-0">
                    {airport.iata}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">
                      {airport.city}
                      <span className="text-muted-foreground font-normal">, {airport.country}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{airport.name}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {emptyHint && selected.length === 0 && !open && (
        <p className="mt-2 text-xs text-muted-foreground">{emptyHint}</p>
      )}
    </div>
  )
}

"use client"

import * as React from "react"
import { Sparkles, Loader2, Check, Plus, RefreshCw, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import type { DiscoveredDestination, DestinationDiscoveryInput } from "@/lib/types"

interface AiDestinationSuggesterProps {
  origins: string[]
  startDate: string
  endDate: string
  tripDurationMin: string
  tripDurationMax: string
  budget: string
  preferredWeekdays: string[]
  maxLayovers: string
  selectedIatas: string[]
  onAdd: (iata: string) => void
  onMarkAiUsed?: () => void
}

const PROMPT_CHIPS = [
  "Beach + nightlife in Europe",
  "Cultural cities, walkable",
  "Cheap food, warm weather",
  "Off-the-beaten-path",
  "Mountains and hiking",
]

export function AiDestinationSuggester({
  origins,
  startDate,
  endDate,
  tripDurationMin,
  tripDurationMax,
  budget,
  preferredWeekdays,
  maxLayovers,
  selectedIatas,
  onAdd,
  onMarkAiUsed,
}: AiDestinationSuggesterProps) {
  const [expanded, setExpanded] = React.useState(false)
  const [prompt, setPrompt] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [suggestions, setSuggestions] = React.useState<DiscoveredDestination[]>([])
  const [hasRun, setHasRun] = React.useState(false)

  const validOrigins = origins.filter((o) => o.trim() !== "")
  const canDiscover = validOrigins.length > 0 && Boolean(startDate) && Boolean(endDate)

  const discover = async () => {
    if (!canDiscover) {
      toast({
        title: "Add origin and dates first",
        description: "AI suggestions need to know where you're flying from and when.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const input: DestinationDiscoveryInput = {
        origins: validOrigins,
        dateRange: { start: startDate, end: endDate },
        tripLengths: {
          min: Number.parseInt(tripDurationMin),
          max: Number.parseInt(tripDurationMax),
        },
        preferences: {
          budget: budget ? Number.parseFloat(budget) : undefined,
          preferred_weekdays: preferredWeekdays.length > 0 ? preferredWeekdays : undefined,
          max_layovers: Number.parseInt(maxLayovers),
        },
        prompt: prompt.trim() || undefined,
      }

      const response = await fetch("/api/ai/discover-destinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Could not get suggestions")
      }

      const data = await response.json()
      setSuggestions(data.destinations || [])
      setHasRun(true)
    } catch (err) {
      toast({
        title: "Couldn't fetch suggestions",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = (iata: string) => {
    onAdd(iata)
    onMarkAiUsed?.()
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-semibold">Need ideas? Ask AI</div>
            <div className="text-xs text-muted-foreground truncate">
              Describe a vibe and we&apos;ll suggest destinations from your origins.
            </div>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform shrink-0",
            expanded && "rotate-180"
          )}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-primary/10 pt-4">
          <div className="space-y-2">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. somewhere warm with great food and not too touristy"
              rows={2}
              className="resize-none bg-background text-sm"
            />
            <div className="flex flex-wrap gap-1.5">
              {PROMPT_CHIPS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPrompt(p)}
                  className="text-xs px-2.5 py-1 rounded-full border border-border bg-background hover:bg-accent hover:border-primary/40 transition-colors text-muted-foreground hover:text-foreground"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {!canDiscover && (
            <p className="text-xs text-muted-foreground">
              Add at least one origin and pick a date range above to enable suggestions.
            </p>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={discover}
              disabled={isLoading || !canDiscover}
              className="flex-1"
              size="sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Thinking…
                </>
              ) : hasRun ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Get new suggestions
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Suggest destinations
                </>
              )}
            </Button>
          </div>

          {isLoading && suggestions.length === 0 && (
            <div className="grid gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-md bg-muted/50 animate-pulse"
                />
              ))}
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                {suggestions.length} suggestions — click to add
              </div>
              <div className="grid gap-2">
                {suggestions.map((dest) => {
                  const isAdded = selectedIatas.includes(dest.airport)
                  return (
                    <div
                      key={dest.airport}
                      className={cn(
                        "flex items-start gap-3 rounded-md border p-3 transition-all bg-background",
                        isAdded
                          ? "border-primary/40 bg-primary/5"
                          : "border-border hover:border-primary/30 hover:shadow-sm"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">
                            {dest.city}
                          </span>
                          <span className="text-xs text-muted-foreground">{dest.country}</span>
                          <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {dest.airport}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-snug">
                          {dest.reason}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={isAdded ? "outline" : "default"}
                        onClick={() => !isAdded && handleAdd(dest.airport)}
                        disabled={isAdded}
                        className="shrink-0 h-8"
                      >
                        {isAdded ? (
                          <>
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Added
                          </>
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

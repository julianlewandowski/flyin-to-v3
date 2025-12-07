"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Route, ArrowRight, Calendar, Sparkles, ExternalLink } from "lucide-react"
import type { AlternativeSuggestions } from "@/lib/types"

interface AlternativeSuggestionsCardProps {
  data: AlternativeSuggestions
}

export default function AlternativeSuggestionsCard({ data }: AlternativeSuggestionsCardProps) {
  if (!data || data.alternatives?.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Route className="h-5 w-5 text-orange-500" />
            Alternative Routes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No alternative routes available. Search for flights to see options.
          </p>
        </CardContent>
      </Card>
    )
  }

  const { alternatives, ai_suggestion, original_dates } = data

  return (
    <Card className="overflow-hidden py-0">
      <CardHeader className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-b py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Route className="h-5 w-5 text-orange-500" />
            Alternative Routes
          </CardTitle>
          {original_dates.start && (
            <Badge variant="outline" className="text-xs">
              <Calendar className="h-3 w-3 mr-1" />
              Planned: {new Date(original_dates.start).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="py-5 space-y-4">
        {/* Route List */}
        <div className="space-y-3">
          {alternatives.slice(0, 5).map((alt, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors hover:bg-muted/50 ${
                alt.savings > 0 ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10" : ""
              }`}
            >
              <div className="flex-1">
                {/* Route */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{alt.origin}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="font-semibold text-sm">{alt.destination}</span>
                </div>
                
                {/* Date difference */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {alt.date_difference && (
                    <span className={alt.date_difference === "Same as planned" ? "text-blue-600" : "text-amber-600"}>
                      {alt.date_difference}
                    </span>
                  )}
                  {alt.airline && (
                    <>
                      <span>•</span>
                      <span>{alt.airline}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">€{alt.cheapest_price}</span>
                  {alt.savings > 0 && (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 text-xs">
                      Save €{alt.savings}
                    </Badge>
                  )}
                </div>
                {alt.original_price && alt.original_price !== alt.cheapest_price && (
                  <span className="text-xs text-muted-foreground line-through">
                    €{alt.original_price}
                  </span>
                )}
              </div>

              {/* Book Button */}
              {alt.booking_link && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2"
                  onClick={() => window.open(alt.booking_link!, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Show more if there are more alternatives */}
        {alternatives.length > 5 && (
          <p className="text-xs text-center text-muted-foreground">
            +{alternatives.length - 5} more routes available
          </p>
        )}

        {/* AI Suggestion */}
        {ai_suggestion && (
          <div className="flex gap-3 p-3 bg-muted/50 rounded-lg mt-4">
            <Sparkles className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground leading-relaxed">{ai_suggestion}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

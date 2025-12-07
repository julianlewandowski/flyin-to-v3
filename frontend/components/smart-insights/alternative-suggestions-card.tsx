"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Route, ArrowRight, Calendar, Sparkles, ExternalLink, CheckCircle2, MapPin } from "lucide-react"
import type { AlternativeSuggestions } from "@/lib/types"

interface AlternativeSuggestionsCardProps {
  data: AlternativeSuggestions
}

export default function AlternativeSuggestionsCard({ data }: AlternativeSuggestionsCardProps) {
  if (!data || data.alternatives?.length === 0) {
    return (
      <Card className="overflow-hidden py-0">
        <CardHeader className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-b py-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Route className="h-5 w-5 text-orange-500" />
            Alternative Routes
          </CardTitle>
        </CardHeader>
        <CardContent className="py-5">
          <p className="text-sm text-muted-foreground">
            No alternative routes available. Search for flights to see options.
          </p>
        </CardContent>
      </Card>
    )
  }

  const { alternatives, ai_suggestion, original_dates } = data
  
  // Find the best route (cheapest)
  const bestRoute = alternatives.reduce((min, alt) => 
    alt.cheapest_price < min.cheapest_price ? alt : min
  , alternatives[0])
  
  // Check if there's only one route or if the best route is significantly cheaper
  const hasOnlyOneRoute = alternatives.length === 1
  const otherRoutes = alternatives.filter(alt => alt !== bestRoute)

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
        {/* Best Route Highlight */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm font-semibold text-green-700 dark:text-green-400">
              {hasOnlyOneRoute ? "Your Selected Route" : "Best Value Route"}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-lg">{bestRoute.origin}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="font-bold text-lg">{bestRoute.destination}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {bestRoute.date_difference && (
                  <span className={bestRoute.date_difference === "Same as planned" ? "text-blue-600" : "text-amber-600"}>
                    {bestRoute.date_difference}
                  </span>
                )}
                {bestRoute.airline && (
                  <>
                    <span>•</span>
                    <span>{bestRoute.airline}</span>
                  </>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-green-600">€{bestRoute.cheapest_price}</span>
              {bestRoute.savings > 0 && (
                <p className="text-xs text-green-600">Save €{bestRoute.savings}</p>
              )}
            </div>
          </div>
          
          {hasOnlyOneRoute && (
            <p className="text-xs text-green-700 dark:text-green-400 mt-3 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              This is the best available route for your search criteria
            </p>
          )}
        </div>

        {/* Other Alternative Routes */}
        {otherRoutes.length > 0 && (
          <>
            <p className="text-sm font-medium text-muted-foreground">Other Options</p>
            <div className="space-y-2">
              {otherRoutes.slice(0, 4).map((alt, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border transition-colors hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{alt.origin}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="font-semibold text-sm">{alt.destination}</span>
                    </div>
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

                  <div className="text-right">
                    <span className="text-lg font-bold">€{alt.cheapest_price}</span>
                    {alt.cheapest_price > bestRoute.cheapest_price && (
                      <p className="text-xs text-red-500">
                        +€{alt.cheapest_price - bestRoute.cheapest_price}
                      </p>
                    )}
                  </div>

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
          </>
        )}

        {/* Show more if there are more alternatives */}
        {otherRoutes.length > 4 && (
          <p className="text-xs text-center text-muted-foreground">
            +{otherRoutes.length - 4} more routes available
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

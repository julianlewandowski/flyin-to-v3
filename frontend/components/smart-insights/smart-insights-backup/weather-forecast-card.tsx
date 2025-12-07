"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Droplets, Sparkles, Shirt } from "lucide-react"
import type { WeatherForecast, WeatherDay } from "@/lib/types"

interface WeatherForecastCardProps {
  data: WeatherForecast
}

// Weather icon mapping
function getWeatherIcon(condition: string) {
  const lowerCondition = condition.toLowerCase()
  if (lowerCondition.includes("rain") || lowerCondition.includes("drizzle")) {
    return <CloudRain className="h-6 w-6 text-blue-500" />
  }
  if (lowerCondition.includes("snow")) {
    return <CloudSnow className="h-6 w-6 text-slate-400" />
  }
  if (lowerCondition.includes("cloud")) {
    return <Cloud className="h-6 w-6 text-gray-400" />
  }
  return <Sun className="h-6 w-6 text-yellow-500" />
}

// Small weather icon for forecast
function getSmallWeatherIcon(condition: string) {
  const lowerCondition = condition.toLowerCase()
  if (lowerCondition.includes("rain") || lowerCondition.includes("drizzle")) {
    return <CloudRain className="h-4 w-4 text-blue-500" />
  }
  if (lowerCondition.includes("snow")) {
    return <CloudSnow className="h-4 w-4 text-slate-400" />
  }
  if (lowerCondition.includes("cloud")) {
    return <Cloud className="h-4 w-4 text-gray-400" />
  }
  return <Sun className="h-4 w-4 text-yellow-500" />
}

export default function WeatherForecastCard({ data }: WeatherForecastCardProps) {
  if (!data || data.error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cloud className="h-5 w-5 text-sky-500" />
            Weather Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {data?.error || "Weather data unavailable. Try again later."}
          </p>
        </CardContent>
      </Card>
    )
  }

  const { city, forecast, summary, ai_summary, packing_tips, is_estimate } = data

  return (
    <Card className="overflow-hidden py-0">
      <CardHeader className="bg-gradient-to-r from-sky-500/10 to-blue-500/10 border-b py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cloud className="h-5 w-5 text-sky-500" />
            Weather in {city}
          </CardTitle>
          {is_estimate && (
            <Badge variant="outline" className="text-xs">
              Estimated
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="py-6 space-y-6">
        {/* Current/Average Summary */}
        <div className="flex items-center justify-center gap-6">
          <div className="flex items-center gap-3">
            {getWeatherIcon(summary.conditions)}
            <div>
              <p className="text-4xl font-bold">{summary.avg_temperature}°C</p>
              <p className="text-sm text-muted-foreground capitalize">{summary.conditions}</p>
            </div>
          </div>
        </div>

        {/* Daily Forecast */}
        {forecast && forecast.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Daily Forecast</p>
            <div className="grid grid-cols-5 gap-2">
              {forecast.slice(0, 5).map((day, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <span className="text-xs font-medium text-muted-foreground">{day.day}</span>
                  <div className="my-2">{getSmallWeatherIcon(day.condition)}</div>
                  <div className="text-center">
                    <span className="text-sm font-semibold">{day.temp_high}°</span>
                    <span className="text-xs text-muted-foreground"> / {day.temp_low}°</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weather Details */}
        {forecast && forecast.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
              <Droplets className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">{forecast[0].humidity}%</p>
                <p className="text-xs text-muted-foreground">Humidity</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
              <Wind className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium">{forecast[0].wind_speed} km/h</p>
                <p className="text-xs text-muted-foreground">Wind</p>
              </div>
            </div>
          </div>
        )}

        {/* Packing Tips */}
        {packing_tips && packing_tips.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Shirt className="h-4 w-4" />
              <span>What to Pack</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {packing_tips.map((tip, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tip}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* AI Summary */}
        {ai_summary && (
          <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
            <Sparkles className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground leading-relaxed">{ai_summary}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

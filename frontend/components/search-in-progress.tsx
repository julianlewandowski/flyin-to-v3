"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Plane, Search, Sparkles, Check } from "lucide-react"

const STEPS = [
  { key: "search", label: "Searching airlines for the best fares", icon: Search },
  { key: "score", label: "Scoring routes by price and convenience", icon: Plane },
  { key: "insights", label: "Generating AI insights and recommendations", icon: Sparkles },
] as const

export default function SearchInProgress() {
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((s) => (s < STEPS.length - 1 ? s + 1 : s))
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50/60 to-white">
      <CardContent className="py-10 px-6 md:px-10">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-full bg-blue-400/20 blur-2xl animate-pulse-slow" />
            <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <Plane className="h-8 w-8 animate-float-slow" />
            </div>
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-foreground tracking-tight mb-2">
            Finding your flights…
          </h3>
          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
            This usually takes 20–40 seconds. You can wait here or come back later — we'll save everything to this trip.
          </p>
        </div>

        <ol className="space-y-3 max-w-md mx-auto">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            const done = i < activeStep
            const active = i === activeStep
            return (
              <li
                key={step.key}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors duration-500 ${
                  active
                    ? "bg-white border border-blue-200 shadow-sm"
                    : done
                      ? "bg-emerald-50/60 border border-emerald-200/60"
                      : "bg-slate-50/60 border border-slate-200/60"
                }`}
              >
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-500 ${
                    active
                      ? "bg-blue-500 text-white"
                      : done
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-200 text-slate-400"
                  }`}
                >
                  {done ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className={`h-4 w-4 ${active ? "animate-pulse" : ""}`} />
                  )}
                </div>
                <span
                  className={`text-sm font-medium ${
                    active ? "text-foreground" : done ? "text-emerald-700" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}

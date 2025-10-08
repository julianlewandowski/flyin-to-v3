"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2 } from "lucide-react"

interface GenerateInsightsButtonProps {
  holidayId: string
}

export default function GenerateInsightsButton({ holidayId }: GenerateInsightsButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch(`/api/holidays/${holidayId}/generate-insights`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate insights")
      }

      // Refresh the page to show new insights
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate insights")
      console.error("[v0] Generate insights error:", err)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleGenerate} disabled={isGenerating} variant="outline" size="sm">
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate AI Insights
          </>
        )}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

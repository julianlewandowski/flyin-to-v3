"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, Sparkles } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface AiScoutButtonProps {
  holidayId: string
}

export default function AiScoutButton({ holidayId }: AiScoutButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleScout = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/holidays/${holidayId}/ai-scout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) throw new Error("Failed to run AI discovery")
      router.refresh()
    } catch (error) {
      console.error("[AiScoutButton] Error:", error)
      toast({
        title: "AI discovery failed",
        description: "Please try again in a moment.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleScout} disabled={isLoading} className="gap-2">
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Discovering…
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          Run AI Discovery
        </>
      )}
    </Button>
  )
}

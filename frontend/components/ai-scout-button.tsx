"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

interface AiScoutButtonProps {
  holidayId: string
}

export default function AiScoutButton({ holidayId }: AiScoutButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleScout = async () => {
    setIsLoading(true)
    try {
      // Get auth token from Supabase
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`
      }

      const response = await fetch(`${BACKEND_URL}/holidays/${holidayId}/ai-scout`, {
        method: "POST",
        headers,
      })

      if (!response.ok) {
        throw new Error("Failed to run AI scout")
      }

      router.refresh()
    } catch (error) {
      console.error("[v0] Error running AI scout:", error)
      alert("Failed to run AI discovery. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleScout} disabled={isLoading} className="gap-2">
      <Sparkles className="h-4 w-4" />
      {isLoading ? "Discovering..." : "Run AI Discovery"}
    </Button>
  )
}

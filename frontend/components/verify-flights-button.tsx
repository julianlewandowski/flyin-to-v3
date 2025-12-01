"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"

interface VerifyFlightsButtonProps {
  holidayId: string
  variant?: "default" | "outline"
}

export default function VerifyFlightsButton({ holidayId, variant = "default" }: VerifyFlightsButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleVerify = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/holidays/${holidayId}/verify-flights`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to verify flights")
      }

      router.refresh()
    } catch (error) {
      console.error("[v0] Error verifying flights:", error)
      alert("Failed to verify flights. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleVerify} disabled={isLoading} variant={variant} className="gap-2">
      <CheckCircle className="h-4 w-4" />
      {isLoading ? "Verifying..." : variant === "outline" ? "Rescan" : "Verify Flights"}
    </Button>
  )
}

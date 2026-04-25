"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

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

      if (!response.ok) throw new Error("Failed to verify flights")
      router.refresh()
    } catch (error) {
      console.error("[VerifyFlightsButton] Error:", error)
      toast({
        title: "Verification failed",
        description: "Please try again in a moment.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleVerify} disabled={isLoading} variant={variant} className="gap-2">
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Verifying…
        </>
      ) : (
        <>
          <CheckCircle className="h-4 w-4" />
          {variant === "outline" ? "Rescan" : "Verify Flights"}
        </>
      )}
    </Button>
  )
}

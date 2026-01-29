"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import Clarity from "@microsoft/clarity"
import { createClient } from "@/lib/supabase/client"

export function ClarityScript() {
  const pathname = usePathname()

  useEffect(() => {
    const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID

    if (!projectId) {
      console.warn("Microsoft Clarity project ID is not set. Please add NEXT_PUBLIC_CLARITY_PROJECT_ID to your environment variables.")
      return
    }

    // Initialize Clarity (only once)
    Clarity.init(projectId)
  }, [])

  // Identify user on route changes (for optimal tracking as per Clarity docs)
  useEffect(() => {
    const identifyUser = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          // Identify the user with their user ID
          // Clarity securely hashes the customId on the client before sending
          Clarity.identify(user.id)
        }
      } catch (error) {
        // Silently fail if we can't get user info
        console.debug("Could not identify user for Clarity:", error)
      }
    }

    // Identify user on route change (with a small delay to ensure auth state is ready)
    const timeoutId = setTimeout(identifyUser, 100)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [pathname])

  return null
}









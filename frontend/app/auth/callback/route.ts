import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  // Use NEXT_PUBLIC_SITE_URL in production, fallback to request origin
  const origin = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error("Error exchanging code for session:", error)
      return NextResponse.redirect(`${origin}/auth/login?error=authentication_failed`)
    }
  }

  // Redirect to dashboard after successful authentication
  return NextResponse.redirect(`${origin}/dashboard`)
}

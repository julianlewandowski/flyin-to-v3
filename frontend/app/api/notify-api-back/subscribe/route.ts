import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = typeof body?.email === "string" ? body.email.trim() : ""
    if (!email) {
      return NextResponse.json(
        { error: "Email is required", details: "Provide { email: string } in the request body." },
        { status: 400 }
      )
    }
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const { error } = await supabase.from("api_notify_subscribers").insert({
      email: email.toLowerCase(),
    })

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "This email is already on the list." },
          { status: 409 }
        )
      }
      console.error("[notify-api-back/subscribe] Insert error:", error)
      return NextResponse.json(
        { error: "Failed to subscribe", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, message: "You're on the list. We'll email you when flight search is back." })
  } catch (e) {
    console.error("[notify-api-back/subscribe] Error:", e)
    return NextResponse.json(
      { error: "Something went wrong", details: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    )
  }
}

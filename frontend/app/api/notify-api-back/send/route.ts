/**
 * Notify all "API is back" subscribers that flight search is available again.
 * Call this when SerpAPI credits have reset and the site is usable.
 *
 * Protection: require header x-notify-secret to match NOTIFY_API_BACK_SECRET.
 * Example: curl -X POST https://your-app.vercel.app/api/notify-api-back/send \
 *   -H "x-notify-secret: your-secret"
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendApiBackNotification } from "@/lib/services/email"

const SECRET = process.env.NOTIFY_API_BACK_SECRET

export async function POST(request: NextRequest) {
  if (!SECRET) {
    return NextResponse.json(
      { error: "Notify feature not configured", details: "NOTIFY_API_BACK_SECRET is not set." },
      { status: 500 }
    )
  }

  const provided = request.headers.get("x-notify-secret")
  if (provided !== SECRET) {
    return NextResponse.json(
      { error: "Unauthorized", details: "Invalid or missing x-notify-secret header." },
      { status: 401 }
    )
  }

  const supabase = createAdminClient()
  const { data: rows, error: fetchError } = await supabase
    .from("api_notify_subscribers")
    .select("id, email")

  if (fetchError) {
    console.error("[notify-api-back/send] Fetch error:", fetchError)
    return NextResponse.json(
      { error: "Failed to fetch subscribers", details: fetchError.message },
      { status: 500 }
    )
  }

  if (!rows?.length) {
    return NextResponse.json({ ok: true, sent: 0, message: "No subscribers to notify." })
  }

  const results: { email: string; success: boolean; error?: string }[] = []
  for (const row of rows) {
    const result = await sendApiBackNotification({ to: row.email })
    results.push({
      email: row.email,
      success: result.success,
      error: result.error,
    })
    if (result.success) {
      await supabase.from("api_notify_subscribers").delete().eq("id", row.id)
    }
  }

  const sent = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success)
  if (failed.length > 0) {
    console.warn("[notify-api-back/send] Some emails failed:", failed)
  }

  return NextResponse.json({
    ok: true,
    sent,
    total: rows.length,
    failed: failed.length,
    results,
  })
}

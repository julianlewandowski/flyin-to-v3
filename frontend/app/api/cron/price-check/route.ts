/**
 * Vercel Cron Job - Daily Price Check
 * 
 * This endpoint is called by Vercel Cron once per day.
 * Configure in vercel.json with the cron schedule.
 */

import { NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: Request) {
  // Verify this is a legitimate cron request from Vercel
  const authHeader = request.headers.get("authorization")
  
  // In production, Vercel sets this header for cron jobs
  if (process.env.VERCEL && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  console.log("[Cron] Starting daily price check...")

  try {
    // Call the backend price tracking cron endpoint
    const response = await fetch(`${BACKEND_URL}/price-tracking/cron/daily-check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Cron-Secret": CRON_SECRET || "",
      },
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("[Cron] Backend returned error:", data)
      return NextResponse.json(
        { error: "Backend error", details: data },
        { status: response.status }
      )
    }

    console.log("[Cron] Price check completed:", data)

    return NextResponse.json({
      success: true,
      message: "Daily price check completed",
      results: data,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Cron] Error running price check:", error)
    return NextResponse.json(
      { 
        error: "Failed to run price check",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

// Vercel cron jobs use GET requests
export const dynamic = "force-dynamic"
export const maxDuration = 300 // 5 minutes max for price checking


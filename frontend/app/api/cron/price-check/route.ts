/**
 * Vercel Cron Job - Daily Price Check
 * 
 * This endpoint is called by Vercel Cron once per day at 8 AM UTC.
 * Configure in vercel.json with the cron schedule.
 * 
 * Authentication:
 * - In production (Vercel): Uses CRON_SECRET from Authorization header or x-cron-secret header
 * - In development: Can be called directly for testing
 */

import { NextResponse } from "next/server"
import { runDailyPriceCheck } from "@/lib/services/price-tracker"

export async function GET(request: Request) {
  // Verify this is a legitimate cron request
  // In production, require authentication
  if (process.env.VERCEL) {
    const authHeader = request.headers.get("authorization")
    const cronSecretHeader = request.headers.get("x-cron-secret")
    const url = new URL(request.url)
    const secretParam = url.searchParams.get("secret")
    
    const providedSecret = authHeader?.replace("Bearer ", "") || cronSecretHeader || secretParam
    const expectedSecret = process.env.CRON_SECRET
    
    // If CRON_SECRET is set, require it
    if (expectedSecret && providedSecret !== expectedSecret) {
      console.error("[Cron] Unauthorized: Invalid or missing CRON_SECRET")
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
  }

  console.log("[Cron] Starting daily price check...")

  try {
    const result = await runDailyPriceCheck()

    console.log("[Cron] Price check completed:", result)

    return NextResponse.json({
      success: result.success,
      message: "Daily price check completed",
      results: {
        holidays_checked: result.holidaysChecked,
        alerts_created: result.alertsCreated,
        errors: result.errors,
        details: result.details,
      },
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

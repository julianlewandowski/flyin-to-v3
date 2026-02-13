/**
 * Email Service
 *
 * Handles all outbound email notifications for the price tracking feature.
 * Uses Resend for email delivery.
 */

import { Resend } from "resend"
import { createLogger } from "@/lib/utils/logger"

const logger = createLogger("EmailService")

// ============================================================================
// Configuration
// ============================================================================

const resend = new Resend(process.env.RESEND_API_KEY)

const EMAIL_FROM = process.env.EMAIL_FROM || "Flyin.to <noreply@flyin.to>"
const DEVELOPER_ALERT_EMAIL = process.env.DEVELOPER_ALERT_EMAIL
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://flyin.to"

// ============================================================================
// Types
// ============================================================================

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface PriceDropEmailParams {
  to: string
  userName?: string
  holidayId: string
  holidayName: string
  oldPrice: number
  newPrice: number
  percentDrop: number
  route?: {
    origin?: string
    destination?: string
  }
  dates?: {
    departure?: string
    return?: string
  }
}

export interface TrackingDisabledEmailParams {
  to: string
  userName?: string
  holidayId: string
  holidayName: string
  reason: "inactivity" | "failures"
}

export interface DeveloperAlertParams {
  subject: string
  message: string
  context?: Record<string, unknown>
}

export interface ApiBackNotificationParams {
  to: string
}

// ============================================================================
// Email Templates
// ============================================================================

function getPriceDropEmailHtml(params: PriceDropEmailParams): string {
  const {
    userName,
    holidayName,
    oldPrice,
    newPrice,
    percentDrop,
    route,
    dates,
    holidayId,
  } = params

  const greeting = userName ? `Hi ${userName},` : "Hi,"
  const routeText = route?.origin && route?.destination
    ? `${route.origin} to ${route.destination}`
    : "your tracked route"
  const datesText = dates?.departure
    ? `for ${dates.departure}${dates.return ? ` - ${dates.return}` : ""}`
    : ""
  const projectUrl = `${APP_URL}/holidays/${holidayId}`

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Price Drop Alert</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Price Drop Alert</h1>
  </div>

  <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">
    <p style="margin-top: 0;">${greeting}</p>

    <p>Great news! The price for <strong>${holidayName}</strong> has dropped significantly.</p>

    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #22c55e;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div>
          <span style="color: #666; font-size: 14px;">Was</span>
          <div style="font-size: 20px; text-decoration: line-through; color: #999;">&euro;${oldPrice.toFixed(2)}</div>
        </div>
        <div style="font-size: 24px; color: #22c55e;">→</div>
        <div>
          <span style="color: #666; font-size: 14px;">Now</span>
          <div style="font-size: 28px; font-weight: bold; color: #22c55e;">&euro;${newPrice.toFixed(2)}</div>
        </div>
        <div style="background: #22c55e; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold;">
          ${percentDrop.toFixed(0)}% OFF
        </div>
      </div>

      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
        <div>${routeText}</div>
        ${datesText ? `<div>${datesText}</div>` : ""}
      </div>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${projectUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
        View Deal
      </a>
    </div>

    <p style="color: #666; font-size: 14px; margin-bottom: 0;">
      You're receiving this because you enabled price tracking for this project.
      <a href="${projectUrl}" style="color: #667eea;">Manage tracking settings</a>
    </p>
  </div>
</body>
</html>
  `.trim()
}

function getPriceDropEmailText(params: PriceDropEmailParams): string {
  const { userName, holidayName, oldPrice, newPrice, percentDrop, route, dates, holidayId } = params
  const greeting = userName ? `Hi ${userName},` : "Hi,"
  const routeText = route?.origin && route?.destination ? `${route.origin} to ${route.destination}` : "your tracked route"
  const datesText = dates?.departure ? `for ${dates.departure}${dates.return ? ` - ${dates.return}` : ""}` : ""
  const projectUrl = `${APP_URL}/holidays/${holidayId}`

  return `
${greeting}

Great news! The price for "${holidayName}" has dropped by ${percentDrop.toFixed(0)}%.

Was: €${oldPrice.toFixed(2)}
Now: €${newPrice.toFixed(2)}

Route: ${routeText}
${datesText ? `Dates: ${datesText}` : ""}

View the deal: ${projectUrl}

---
You're receiving this because you enabled price tracking for this project.
  `.trim()
}

function getTrackingDisabledEmailHtml(params: TrackingDisabledEmailParams): string {
  const { userName, holidayName, holidayId, reason } = params
  const greeting = userName ? `Hi ${userName},` : "Hi,"
  const projectUrl = `${APP_URL}/holidays/${holidayId}`

  const reasonText = reason === "inactivity"
    ? "you haven't viewed this project in over 7 days"
    : "we encountered multiple consecutive errors while checking prices"

  const actionText = reason === "inactivity"
    ? "Visit your project to re-enable tracking when you're ready."
    : "Please check your project settings and re-enable tracking if you'd like to continue monitoring prices."

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Price Tracking Paused</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f59e0b; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Price Tracking Paused</h1>
  </div>

  <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">
    <p style="margin-top: 0;">${greeting}</p>

    <p>We've paused price tracking for <strong>${holidayName}</strong> because ${reasonText}.</p>

    <p>${actionText}</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${projectUrl}" style="background: #f59e0b; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
        View Project
      </a>
    </div>

    <p style="color: #666; font-size: 14px; margin-bottom: 0;">
      Questions? Just reply to this email.
    </p>
  </div>
</body>
</html>
  `.trim()
}

function getTrackingDisabledEmailText(params: TrackingDisabledEmailParams): string {
  const { userName, holidayName, holidayId, reason } = params
  const greeting = userName ? `Hi ${userName},` : "Hi,"
  const projectUrl = `${APP_URL}/holidays/${holidayId}`

  const reasonText = reason === "inactivity"
    ? "you haven't viewed this project in over 7 days"
    : "we encountered multiple consecutive errors while checking prices"

  return `
${greeting}

We've paused price tracking for "${holidayName}" because ${reasonText}.

Visit your project to re-enable tracking: ${projectUrl}

Questions? Just reply to this email.
  `.trim()
}

// ============================================================================
// Email Sending Functions
// ============================================================================

/**
 * Send a price drop alert email to the user.
 * Returns success only if the email was delivered.
 */
export async function sendPriceDropAlert(params: PriceDropEmailParams): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    logger.warn("RESEND_API_KEY not configured, skipping email", { holidayId: params.holidayId })
    return { success: false, error: "Email not configured" }
  }

  const subject = `Price dropped ${params.percentDrop.toFixed(0)}% for ${params.holidayName}`

  logger.info("Sending price drop alert", {
    to: params.to,
    holidayId: params.holidayId,
    percentDrop: params.percentDrop,
  })

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: params.to,
      subject,
      html: getPriceDropEmailHtml(params),
      text: getPriceDropEmailText(params),
    })

    if (error) {
      logger.error("Failed to send price drop alert", error, { holidayId: params.holidayId })
      return { success: false, error: error.message }
    }

    logger.info("Price drop alert sent", { messageId: data?.id, holidayId: params.holidayId })
    return { success: true, messageId: data?.id }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    logger.error("Exception sending price drop alert", err, { holidayId: params.holidayId })
    return { success: false, error: errorMessage }
  }
}

/**
 * Send an email notifying the user that tracking was disabled.
 */
export async function sendTrackingDisabledEmail(params: TrackingDisabledEmailParams): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    logger.warn("RESEND_API_KEY not configured, skipping email", { holidayId: params.holidayId })
    return { success: false, error: "Email not configured" }
  }

  const subject = `Price tracking paused for ${params.holidayName}`

  logger.info("Sending tracking disabled email", {
    to: params.to,
    holidayId: params.holidayId,
    reason: params.reason,
  })

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: params.to,
      subject,
      html: getTrackingDisabledEmailHtml(params),
      text: getTrackingDisabledEmailText(params),
    })

    if (error) {
      logger.error("Failed to send tracking disabled email", error, { holidayId: params.holidayId })
      return { success: false, error: error.message }
    }

    logger.info("Tracking disabled email sent", { messageId: data?.id, holidayId: params.holidayId })
    return { success: true, messageId: data?.id }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    logger.error("Exception sending tracking disabled email", err, { holidayId: params.holidayId })
    return { success: false, error: errorMessage }
  }
}

/**
 * Send "flight search is back" notification to a user who subscribed while API was down.
 */
export async function sendApiBackNotification(params: ApiBackNotificationParams): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    logger.warn("RESEND_API_KEY not configured, skipping API back notification", { to: params.to })
    return { success: false, error: "Email not configured" }
  }

  const subject = "Flyin.to flight search is back!"
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flight search is back</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Flight search is back</h1>
  </div>
  <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p>Hi,</p>
    <p>You asked to be notified when Flyin.to flight search was available again. Good news &mdash; it is!</p>
    <p><a href="${APP_URL}/dashboard" style="display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Go to Flyin.to</a></p>
    <p style="color: #6b7280; font-size: 14px;">Thanks for your patience.</p>
  </div>
</body>
</html>
  `.trim()
  const text = `Hi,\n\nYou asked to be notified when Flyin.to flight search was available again. Good news — it is!\n\nVisit ${APP_URL}/dashboard to search for flights.\n\nThanks for your patience.`

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: params.to,
      subject,
      html,
      text,
    })
    if (error) {
      logger.error("Failed to send API back notification", error, { to: params.to })
      return { success: false, error: error.message }
    }
    logger.info("API back notification sent", { messageId: data?.id, to: params.to })
    return { success: true, messageId: data?.id }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    logger.error("Exception sending API back notification", err, { to: params.to })
    return { success: false, error: errorMessage }
  }
}

/**
 * Send an alert to the developer when something goes wrong.
 */
export async function sendDeveloperAlert(params: DeveloperAlertParams): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY || !DEVELOPER_ALERT_EMAIL) {
    logger.warn("Developer alerts not configured", { subject: params.subject })
    return { success: false, error: "Developer alerts not configured" }
  }

  const contextText = params.context
    ? Object.entries(params.context)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join("\n")
    : ""

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: monospace; padding: 20px;">
  <h2 style="color: #dc2626;">Flyin.to Alert: ${params.subject}</h2>
  <p>${params.message}</p>
  ${contextText ? `<pre style="background: #f3f4f6; padding: 15px; border-radius: 8px; overflow-x: auto;">${contextText}</pre>` : ""}
  <p style="color: #666; font-size: 12px;">Timestamp: ${new Date().toISOString()}</p>
</body>
</html>
  `.trim()

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: DEVELOPER_ALERT_EMAIL,
      subject: `[Flyin.to Alert] ${params.subject}`,
      html,
      text: `${params.subject}\n\n${params.message}\n\n${contextText}`,
    })

    if (error) {
      logger.error("Failed to send developer alert", error)
      return { success: false, error: error.message }
    }

    logger.info("Developer alert sent", { messageId: data?.id, subject: params.subject })
    return { success: true, messageId: data?.id }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    logger.error("Exception sending developer alert", err)
    return { success: false, error: errorMessage }
  }
}

/**
 * Send an email with retry logic.
 * Attempts up to maxAttempts times with a delay between attempts.
 */
export async function sendEmailWithRetry<T extends EmailResult>(
  sendFn: () => Promise<T>,
  context: { holidayId?: string; emailType: string },
  maxAttempts = 2
): Promise<T & { attempts: number }> {
  let lastResult: T | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    logger.info(`Email attempt ${attempt}/${maxAttempts}`, context)

    const result = await sendFn()
    lastResult = result

    if (result.success) {
      return { ...result, attempts: attempt }
    }

    if (attempt < maxAttempts) {
      // Wait 2 seconds before retry
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }

  // All attempts failed - alert developer
  logger.error(`Email failed after ${maxAttempts} attempts`, undefined, context)

  await sendDeveloperAlert({
    subject: `Email delivery failed: ${context.emailType}`,
    message: `Failed to send ${context.emailType} email after ${maxAttempts} attempts.`,
    context: {
      ...context,
      lastError: lastResult?.error,
    },
  })

  return { ...lastResult!, attempts: maxAttempts }
}

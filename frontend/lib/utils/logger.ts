/**
 * Structured logging utility for consistent logging across migrated services.
 * 
 * Provides context-aware logging with service prefixes for easier debugging.
 */

export type LogLevel = "debug" | "info" | "warn" | "error"

export interface LogContext {
  service: string
  operation?: string
  holidayId?: string
  userId?: string
  duration?: number
  [key: string]: unknown
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

// Default to "info" in production, "debug" in development
const CURRENT_LOG_LEVEL: LogLevel = 
  (process.env.LOG_LEVEL as LogLevel) || 
  (process.env.NODE_ENV === "production" ? "info" : "debug")

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LOG_LEVEL]
}

function formatMessage(level: LogLevel, context: LogContext, message: string): string {
  const timestamp = new Date().toISOString()
  const prefix = `[${context.service}]${context.operation ? `[${context.operation}]` : ""}`
  return `${timestamp} ${level.toUpperCase()} ${prefix} ${message}`
}

function formatContext(context: LogContext): Record<string, unknown> {
  const { service, operation, ...rest } = context
  return Object.keys(rest).length > 0 ? rest : {}
}

/**
 * Create a logger instance for a specific service
 */
export function createLogger(service: string) {
  return {
    debug(message: string, context: Partial<LogContext> = {}) {
      if (shouldLog("debug")) {
        const fullContext = { service, ...context }
        const extra = formatContext(fullContext)
        if (Object.keys(extra).length > 0) {
          console.debug(formatMessage("debug", fullContext, message), extra)
        } else {
          console.debug(formatMessage("debug", fullContext, message))
        }
      }
    },

    info(message: string, context: Partial<LogContext> = {}) {
      if (shouldLog("info")) {
        const fullContext = { service, ...context }
        const extra = formatContext(fullContext)
        if (Object.keys(extra).length > 0) {
          console.info(formatMessage("info", fullContext, message), extra)
        } else {
          console.info(formatMessage("info", fullContext, message))
        }
      }
    },

    warn(message: string, context: Partial<LogContext> = {}) {
      if (shouldLog("warn")) {
        const fullContext = { service, ...context }
        const extra = formatContext(fullContext)
        if (Object.keys(extra).length > 0) {
          console.warn(formatMessage("warn", fullContext, message), extra)
        } else {
          console.warn(formatMessage("warn", fullContext, message))
        }
      }
    },

    error(message: string, error?: Error | unknown, context: Partial<LogContext> = {}) {
      if (shouldLog("error")) {
        const fullContext = { service, ...context }
        const extra = formatContext(fullContext)
        
        if (error instanceof Error) {
          console.error(formatMessage("error", fullContext, message), {
            ...extra,
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack,
            },
          })
        } else if (error !== undefined) {
          console.error(formatMessage("error", fullContext, message), {
            ...extra,
            error: String(error),
          })
        } else if (Object.keys(extra).length > 0) {
          console.error(formatMessage("error", fullContext, message), extra)
        } else {
          console.error(formatMessage("error", fullContext, message))
        }
      }
    },

    /**
     * Log with timing - useful for performance tracking
     */
    timed<T>(operation: string, fn: () => Promise<T>, context: Partial<LogContext> = {}): Promise<T> {
      const start = Date.now()
      this.debug(`Starting ${operation}`, { operation, ...context })
      
      return fn()
        .then((result) => {
          const duration = Date.now() - start
          this.info(`Completed ${operation}`, { operation, duration, ...context })
          return result
        })
        .catch((error) => {
          const duration = Date.now() - start
          this.error(`Failed ${operation}`, error, { operation, duration, ...context })
          throw error
        })
    },
  }
}

/**
 * Pre-configured loggers for migrated services
 */
export const loggers = {
  priceTracker: createLogger("PriceTracker"),
  insights: createLogger("Insights"),
  destinationDiscovery: createLogger("DestinationDiscovery"),
}

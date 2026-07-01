import type { H3Event } from 'h3'

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  keyPrefix?: string
  keyGenerator?: (event: H3Event) => Promise<string | null> | string | null
}

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRequests: 60, // 60 requests per minute
  windowMs: 60 * 1000, // per minute
}

// Map to store request history: key -> array of timestamps
const requestHistory = new Map<string, number[]>()

// Cap the Map size to prevent unbounded memory growth
const MAX_TRACKED_KEYS = 10000

// Interval-based cleanup (runs every 5 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000
let lastCleanup = 0

/** Clear the rate limit history — exposed for testing. */
export function clearRateLimitHistory() {
  requestHistory.clear()
}

function cleanupStaleEntries(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now
  const oneHourAgo = now - 60 * 60 * 1000
  for (const [key, times] of requestHistory.entries()) {
    const recentTimes = times.filter((t) => t > oneHourAgo)
    if (recentTimes.length === 0) {
      requestHistory.delete(key)
    } else {
      requestHistory.set(key, recentTimes)
    }
  }
}

export async function getClientIdentifier(event: H3Event): Promise<string> {
  // Try to get user ID first (for authenticated requests)
  try {
    const session = await getUserSession(event)
    if (session?.user?.id) {
      return `user:${session.user.id}`
    }
  } catch {
    // User not authenticated, fall through to IP
  }

  // Fall back to IP address for unauthenticated requests.
  // Prefer the direct socket peer address; only consult x-forwarded-for when
  // explicitly trusting a proxy, and then use the rightmost untrusted hop.
  const socketAddress = event.node.req.socket?.remoteAddress
  let ip = socketAddress || getHeader(event, 'x-real-ip') || 'unknown'

  if (!socketAddress && process.env.TRUST_PROXY) {
    const forwarded = getHeader(event, 'x-forwarded-for')
    if (forwarded) {
      const parts = forwarded
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
      if (parts.length > 0) {
        ip = parts[parts.length - 1]
      }
    }
  }

  return `ip:${ip}`
}

export function applyRateLimit(
  handler: (event: H3Event) => Promise<any>,
  config: Partial<RateLimitConfig> = {}
) {
  const finalConfig = { ...DEFAULT_RATE_LIMIT_CONFIG, ...config }

  return async (event: H3Event) => {
    let identifier: string
    if (finalConfig.keyGenerator) {
      const generated = await finalConfig.keyGenerator(event)
      identifier = generated ?? (await getClientIdentifier(event))
    } else {
      identifier = await getClientIdentifier(event)
    }
    if (finalConfig.keyPrefix) {
      identifier = `${finalConfig.keyPrefix}:${identifier}`
    }

    const now = Date.now()

    // Run cleanup on a time-based interval instead of probabilistically
    cleanupStaleEntries(now)

    // Treat maxRequests <= 0 as always-limited
    if (finalConfig.maxRequests <= 0) {
      setHeader(event, 'Retry-After', Math.ceil(finalConfig.windowMs / 1000))
      throw createError({
        status: 429,
        statusMessage: 'Too Many Requests',
        data: {
          message: `Rate limit exceeded. Max ${finalConfig.maxRequests} requests per ${finalConfig.windowMs / 1000}s.`,
          retryAfter: Math.ceil(finalConfig.windowMs / 1000),
        },
      })
    }

    // Get or initialize request history for this identifier
    let history = requestHistory.get(identifier) || []

    // Remove old requests outside the window
    history = history.filter((timestamp) => now - timestamp < finalConfig.windowMs)

    // Check if rate limit exceeded
    if (history.length >= finalConfig.maxRequests) {
      const oldestRequest = history[0]
      const resetTime = new Date(oldestRequest + finalConfig.windowMs)
      const retryAfter = Math.ceil(
        (oldestRequest + finalConfig.windowMs - now) / 1000
      )

      setHeader(event, 'Retry-After', retryAfter)

      throw createError({
        status: 429,
        statusMessage: 'Too Many Requests',
        data: {
          message: `Rate limit exceeded. Max ${finalConfig.maxRequests} requests per ${finalConfig.windowMs / 1000}s.`,
          retryAfter,
          resetTime: resetTime.toISOString(),
        },
      })
    }

    // Add current request
    history.push(now)
    requestHistory.set(identifier, history)

    // Enforce Map size cap by evicting the oldest entry
    if (requestHistory.size > MAX_TRACKED_KEYS) {
      const firstKey = requestHistory.keys().next().value
      if (firstKey !== undefined) {
        requestHistory.delete(firstKey)
      }
    }

    return await handler(event)
  }
}

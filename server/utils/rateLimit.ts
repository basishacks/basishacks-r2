import type { H3Event } from 'h3'

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRequests: 60, // 60 requests per minute
  windowMs: 60 * 1000, // per minute
}

// Map to store request history: key -> array of timestamps
const requestHistory = new Map<string, number[]>()

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

  // Fall back to IP address for unauthenticated requests
  const ip =
    getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() ||
    getHeader(event, 'cf-connecting-ip') ||
    getHeader(event, 'x-real-ip') ||
    'unknown'

  return `ip:${ip}`
}

export function applyRateLimit(
  handler: (event: H3Event) => Promise<any>,
  config: Partial<RateLimitConfig> = {}
) {
  const finalConfig = { ...DEFAULT_RATE_LIMIT_CONFIG, ...config }

  return async (event: H3Event) => {
    const identifier = await getClientIdentifier(event)
    const now = Date.now()

    // Get or initialize request history for this identifier
    let history = requestHistory.get(identifier) || []

    // Remove old requests outside the window
    history = history.filter((timestamp) => now - timestamp < finalConfig.windowMs)

    // Check if rate limit exceeded
    if (history.length >= finalConfig.maxRequests) {
      const oldestRequest = history[0]
      if (!oldestRequest) return;
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

    // Periodic memory cleanup
    if (Math.random() < 0.01) {
      const oneHourAgo = now - 60 * 60 * 1000
      for (const [key, times] of requestHistory.entries()) {
        const recentTimes = times.filter((t) => now - t < oneHourAgo)
        if (recentTimes.length === 0) {
          requestHistory.delete(key)
        } else {
          requestHistory.set(key, recentTimes)
        }
      }
    }

    return await handler(event)
  }
}

# Rate Limiting

Rate limiting is implemented in `server/utils/rateLimit.ts` using an in-memory sliding window algorithm.

## Configuration

### Default Limits

| Setting | Value |
|---------|-------|
| Max requests | 60 per minute |
| Window | 60,000ms (1 minute) |

### Custom Limits

Some endpoints use stricter rate limits:

| Endpoint | Max Requests | Window |
|----------|-------------|--------|
| `PATCH /api/users/:id` | 10 | 60,000ms |
| Most other endpoints | 60 | 60,000ms |

## Usage

### Applying Rate Limiting

Wrap any API handler with `applyRateLimit`:

```typescript
import { applyRateLimit } from '~/server/utils/rateLimit'

export default applyRateLimit(
  defineEventHandler(async (event) => {
    // handler logic
  }),
  { maxRequests: 10, windowMs: 60 * 1000 }
)
```

### Custom Configuration

```typescript
interface RateLimitConfig {
  maxRequests: number  // Maximum requests allowed in the window
  windowMs: number     // Time window in milliseconds
}
```

## Client Identification

The rate limiter identifies clients using a two-tier approach:

1. **Authenticated users**: Identified by `user:{id}` from the session
2. **Unauthenticated requests**: Identified by `ip:{address}` from headers:
   - `x-forwarded-for` (first value)
   - `cf-connecting-ip` (Cloudflare)
   - `x-real-ip`
   - Fallback: `unknown`

## Response Headers

When rate limited, the response includes:

| Header | Description |
|--------|-------------|
| `Retry-After` | Seconds until the client can retry |

## Error Response

```json
{
  "statusCode": 429,
  "statusMessage": "Too Many Requests",
  "data": {
    "message": "Rate limit exceeded. Max 60 requests per 60s.",
    "retryAfter": 45,
    "resetTime": "2026-06-02T12:00:00.000Z"
  }
}
```

## Memory Management

The rate limiter includes automatic memory cleanup:

- **Probabilistic cleanup**: 1% chance per request to run cleanup
- **Cleanup threshold**: Removes entries older than 1 hour
- **Empty entry removal**: Deletes keys with no recent requests

```typescript
// Cleanup runs probabilistically
if (Math.random() < 0.01) {
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
```

## Limitations

### Production (Cloudflare Pages)

In production, rate limiting operates **per Cloudflare isolate**, not globally:

- Each edge function instance has its own `requestHistory` Map
- A user could potentially exceed the rate limit by hitting different isolates
- This is acceptable for most use cases but not suitable for strict rate enforcement

### Possible Improvements

- **Cloudflare Rate Limiting Rules**: Use Cloudflare's built-in rate limiting at the edge
- **D1-backed rate limiting**: Store request counts in D1 for global enforcement
- **Workers KV**: Use KV for distributed rate limit counters

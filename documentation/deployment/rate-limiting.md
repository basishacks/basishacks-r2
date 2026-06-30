---
title: Rate Limiting
description: In-memory rate limiting for API endpoint protection
---

# Rate Limiting

All API endpoints are protected by an in-memory rate limiter that prevents abuse by limiting the number of requests a client can make within a time window.

::: info Source
`server/utils/rateLimit.ts`
:::

## Default Configuration

| Setting | Value |
|---------|-------|
| Max requests | 60 |
| Window | 60,000 ms (1 minute) |
| Rate | 60 requests per minute |

```ts
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRequests: 60,
  windowMs: 60 * 1000,
}
```

## Configuration Interface

```ts
interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}
```

## Usage

### `applyRateLimit(handler, config?)`

Wraps an API handler with rate limiting:

```ts
import { applyRateLimit } from '~/server/utils/rateLimit'

export default applyRateLimit(async (event) => {
  // Your handler logic
}, {
  maxRequests: 30,    // Optional: override default
  windowMs: 60 * 1000 // Optional: override default
})
```

If `config` is omitted, the default configuration (60 req/min) is used.

## Client Identification

The rate limiter identifies clients using a two-tier strategy:

### 1. Authenticated Users

If the request has a valid session, the user ID is used:

```
user:{id}
```

This means each authenticated user has their own rate limit bucket, regardless of IP address.

### 2. Unauthenticated Requests

If no session is found, the client IP is used:

```
ip:{ip}
```

The IP address is extracted from the following headers, in priority order:

| Priority | Header | Notes |
|:--------:|--------|-------|
| 1 | `x-forwarded-for` | First value after splitting on comma (leftmost = original client) |
| 2 | `x-real-ip` | Set by reverse proxies |
| 3 | `unknown` | Fallback if no header is present |

```ts
const ip =
  getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() ||
  getHeader(event, 'x-real-ip') ||
  'unknown'
```

## Rate Limit Response

When the rate limit is exceeded, the handler throws a **429 Too Many Requests** error:

```json
{
  "statusCode": 429,
  "statusMessage": "Too Many Requests",
  "data": {
    "message": "Rate limit exceeded. Max 60 requests per 60s.",
    "retryAfter": 42,
    "resetTime": "2026-06-03T14:30:00.000Z"
  }
}
```

### Response Headers

| Header | Value | Description |
|--------|-------|-------------|
| `Retry-After` | Seconds until the rate limit resets | Standard HTTP header indicating when the client can retry |

The `Retry-After` value is calculated as:

```ts
const retryAfter = Math.ceil(
  (oldestRequest + finalConfig.windowMs - now) / 1000
)
```

## Memory Management

### Request History Storage

Request timestamps are stored in an in-memory `Map`:

```ts
const requestHistory = new Map<string, number[]>()
```

Each key (client identifier) maps to an array of request timestamps within the current window.

### Window Cleanup

On every request, timestamps outside the current window are filtered out:

```ts
history = history.filter((timestamp) => now - timestamp < finalConfig.windowMs)
```

### Probabilistic Full Cleanup

To prevent memory leaks from inactive clients, a **1% probabilistic cleanup** runs on each request:

```ts
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

This removes entries with no requests in the last hour. The probabilistic approach (1% chance per request) avoids the overhead of running cleanup on every single request while still ensuring stale entries are eventually removed.

## Limitations

### Per-Instance Isolation

::: warning Single Process
Rate limiting is **in-memory and per-process**. Each server process maintains its own `requestHistory` Map. This means:

- A client making 60 requests to process A and 60 requests to process B within the same minute would not be rate-limited
- The effective rate limit is per-process, not globally distributed
- For global rate limiting, consider using a distributed store (e.g., Redis)
:::

### No Persistent State

Since the rate limit state is in-memory:
- It resets when the server restarts
- It does not persist across deployments
- Multiple server instances do not share state

### IP Spoofing

The `x-forwarded-for` header can be spoofed. In production behind a reverse proxy (e.g., nginx), `x-real-ip` is more reliable as it is set by the proxy and cannot be forged by clients.

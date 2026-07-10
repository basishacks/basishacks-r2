---
title: Rate Limiting
description: In-memory rate limiting for API endpoint protection
---

# Rate Limiting

All API endpoints are protected by an in-memory rate limiter that prevents abuse by limiting the number of requests a client can make within a time window.

::: info Source `server/utils/rateLimit.ts` :::

## Default Configuration

| Setting      | Value                  |
| ------------ | ---------------------- |
| Max requests | 60                     |
| Window       | 60,000 ms (1 minute)   |
| Rate         | 60 requests per minute |

```ts
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
    maxRequests: 60,
    windowMs: 60 * 1000,
};
```

## Configuration Interface

```ts
interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
    keyPrefix?: string;
    keyGenerator?: (event: H3Event) => Promise<string | null> | string | null;
}
```

- `maxRequests`: Maximum number of requests allowed within the window
- `windowMs`: Time window in milliseconds
- `keyPrefix`: Optional prefix added to the generated client identifier
- `keyGenerator`: Optional custom function that returns a client identifier; if it returns `null`, the default identifier is used

## Usage

### `applyRateLimit(handler, config?)`

Wraps an API handler with rate limiting:

```ts
import { applyRateLimit } from "~/server/utils/rateLimit";

export default applyRateLimit(
    async (event) => {
        // Your handler logic
    },
    {
        maxRequests: 30, // Optional: override default
        windowMs: 60 * 1000, // Optional: override default
    },
);
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

If no session is found, the request is identified by IP address:

```
ip:{ip}
```

The IP address is resolved in the following priority order:

| Priority | Source | Notes |
| :-: | --- | --- |
| 1 | Direct socket peer address | `event.node.req.socket.remoteAddress`; used when available |
| 2 | `x-real-ip` header | Fallback when no socket address is present |
| 3 | `x-forwarded-for` header | Used only when `TRUST_PROXY` is set; the rightmost value is used to avoid spoofed leftmost hops |
| 4 | `unknown` | Fallback when no address can be determined |

```ts
const socketAddress = event.node.req.socket?.remoteAddress;
let ip = socketAddress || getHeader(event, "x-real-ip") || "unknown";

if (!socketAddress && process.env.TRUST_PROXY) {
    const forwarded = getHeader(event, "x-forwarded-for");
    if (forwarded) {
        const parts = forwarded
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);
        if (parts.length > 0) {
            ip = parts[parts.length - 1];
        }
    }
}

return `ip:${ip}`;
```

::: tip Set `TRUST_PROXY` only when the application runs behind a trusted reverse proxy. Without this variable, the rate limiter ignores `x-forwarded-for` entirely. :::

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
| --- | --- | --- |
| `Retry-After` | Seconds until the rate limit resets | Standard HTTP header indicating when the client can retry |

The `Retry-After` value is calculated as:

```ts
const retryAfter = Math.ceil((oldestRequest + finalConfig.windowMs - now) / 1000);
```

## Memory Management

### Request History Storage

Request timestamps are stored in an in-memory `Map`:

```ts
const requestHistory = new Map<string, number[]>();
```

Each key (client identifier) maps to an array of request timestamps within the current window.

### Window Cleanup

On every request, timestamps outside the current window are filtered out:

```ts
history = history.filter((timestamp) => now - timestamp < finalConfig.windowMs);
```

### Periodic Full Cleanup

To prevent memory leaks from inactive clients, a full cleanup runs at most once every 5 minutes:

```ts
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
// ...
function cleanupStaleEntries(now: number) {
    if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
    lastCleanup = now;
    const oneHourAgo = now - 60 * 60 * 1000;
    for (const [key, times] of requestHistory.entries()) {
        const recentTimes = times.filter((t) => t > oneHourAgo);
        if (recentTimes.length === 0) {
            requestHistory.delete(key);
        } else {
            requestHistory.set(key, recentTimes);
        }
    }
}
```

This removes entries with no requests in the last hour.

### Map Size Cap

To prevent unbounded growth under high traffic or attack, the `Map` is capped at **10,000 keys**. When the cap is exceeded, the oldest entry is evicted:

```ts
const MAX_TRACKED_KEYS = 10000;
// ...
if (requestHistory.size > MAX_TRACKED_KEYS) {
    const firstKey = requestHistory.keys().next().value;
    if (firstKey !== undefined) {
        requestHistory.delete(firstKey);
    }
}
```

## Limitations

### Per-Instance Isolation

::: warning Single Process Rate limiting is **in-memory and per-process**. Each server process maintains its own `requestHistory` Map. This means:

- A client making 60 requests to process A and 60 requests to process B within the same minute would not be rate-limited
- The effective rate limit is per-process, not globally distributed
- For global rate limiting, consider using a distributed store (e.g., Redis) :::

### No Persistent State

Since the rate limit state is in-memory:

- It resets when the server restarts
- It does not persist across deployments
- Multiple server instances do not share state

### IP Spoofing

The rate limiter prioritizes the direct socket peer address, which cannot be spoofed by the client. When a reverse proxy is in use, set `TRUST_PROXY` so the limiter consults `x-forwarded-for`. In that mode, the rightmost value is used because the leftmost values can be spoofed by the client. The `x-real-ip` header is used only as a fallback when no socket address is present.

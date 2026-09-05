---
title: Rate Limiting
description: In-memory rate limiting for API endpoint protection
---

# Rate Limiting

All API endpoints are protected by an in-memory rate limiter that prevents abuse by limiting the number of requests a client can make within a time window.

::: info Source `server/utils/rateLimit.ts` :::

## Default Configuration

The rate limiter defines **4 independent tiers**, each with its own request counter per client:

| Tier | Env Variable | Default Limit | Routes Protected |
| --- | --- | :-: | --- |
| **General** | `RATE_LIMIT_GENERAL_MAX` | 6000/min | All non-sensitive API routes |
| **Authentication** | `RATE_LIMIT_AUTH_MAX` | 600/min | `/api/login`, `/api/auth/basis/callback` |
| **Vote / Score** | `RATE_LIMIT_VOTE_MAX` | 600/min | `/api/ballot`, `/api/teams/:id/scores` |
| **File Upload** | `RATE_LIMIT_UPLOAD_MAX` | 600/min | `/api/debug/upload` |

All tiers share the same window duration, configurable via `RATE_LIMIT_WINDOW_MS` (default: `60000` ms / 1 minute).

```ts
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
    maxRequests: 6000, // overridden by RATE_LIMIT_GENERAL_MAX
    windowMs: 60 * 1000, // overridden by RATE_LIMIT_WINDOW_MS
};
```

## Environment Variables

The following environment variables override the default limits:

| Variable | Default | Purpose |
| --- | --- | --- |
| `RATE_LIMIT_GENERAL_MAX` | `6000` | General API rate limit, requests per window |
| `RATE_LIMIT_AUTH_MAX` | `600` | Authentication endpoint rate limit, attempts per window |
| `RATE_LIMIT_VOTE_MAX` | `600` | Voting/scoring endpoint rate limit, submissions per window |
| `RATE_LIMIT_UPLOAD_MAX` | `600` | File upload endpoint rate limit, uploads per window |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window in milliseconds |
| `TRUST_PROXY` | unset | Set to any truthy value when behind a trusted reverse proxy so proxy headers (`cf-connecting-ip`, `x-forwarded-for`, `x-real-ip`) are preferred over the socket peer address for client IP resolution |

These values are read at process startup via `parseEnvInt()` in `server/utils/rateLimit.ts`. If an environment variable is unset or contains a non-numeric value, the default is used instead.

::: tip `TRUST_PROXY` must be explicitly set. Without it, the rate limiter uses only the direct socket peer address and the `x-real-ip` header — behind a proxy the socket is the proxy itself, so every client shares one bucket. Set it to any truthy value (e.g. `1` or `true`) when the app is behind a trusted reverse proxy like nginx or Cloudflare. :::

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

If `config` is omitted, the default configuration (6000 req/min) is used.

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

When `TRUST_PROXY` is set, proxy headers take priority (the socket is the proxy, not the client):

| Priority | Source | Notes |
| :-: | --- | --- |
| 1 | `cf-connecting-ip` header | Authoritative client IP from Cloudflare; `TRUST_PROXY` only |
| 2 | `x-forwarded-for` header | `TRUST_PROXY` only; the rightmost value is used to avoid spoofed leftmost hops |
| 3 | `x-real-ip` header | `TRUST_PROXY` only, when the above are absent |
| 4 | Direct socket peer address | `event.node.req.socket.remoteAddress`; used when `TRUST_PROXY` is unset or no proxy header is present |
| 5 | `x-real-ip` header | Fallback when no socket address is present |
| 6 | `unknown` | Fallback when no address can be determined |

```ts
if (process.env.TRUST_PROXY) {
    const connectingIp = getHeader(event, "cf-connecting-ip");
    if (connectingIp?.trim()) return `ip:${connectingIp.trim()}`;
    const forwarded = getHeader(event, "x-forwarded-for");
    if (forwarded) {
        const parts = forwarded
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);
        if (parts.length > 0) return `ip:${parts[parts.length - 1]}`;
    }
    const realIp = getHeader(event, "x-real-ip");
    if (realIp?.trim()) return `ip:${realIp.trim()}`;
}

const socketAddress = event.node.req.socket?.remoteAddress;
const ip = socketAddress || getHeader(event, "x-real-ip") || "unknown";

return `ip:${ip}`;
```

::: tip Set `TRUST_PROXY` only when the application runs behind a trusted reverse proxy. Without this variable, the rate limiter ignores proxy headers entirely. :::

## Rate Limit Response

When the rate limit is exceeded, the handler throws a **429 Too Many Requests** error:

```json
{
    "statusCode": 429,
    "statusMessage": "Too Many Requests",
    "data": {
        "message": "Rate limit exceeded. Max 6000 requests per 60s.",
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

- A client making 6000 requests to process A and 6000 requests to process B within the same minute would not be rate-limited
- The effective rate limit is per-process, not globally distributed
- For global rate limiting, consider using a distributed store (e.g., Redis) :::

### No Persistent State

Since the rate limit state is in-memory:

- It resets when the server restarts
- It does not persist across deployments
- Multiple server instances do not share state

### IP Spoofing

Without `TRUST_PROXY`, the rate limiter prioritizes the direct socket peer address, which cannot be spoofed by the client. When a reverse proxy is in use, set `TRUST_PROXY` so the limiter prefers proxy headers instead: `cf-connecting-ip` first (authoritative from Cloudflare), then the rightmost `x-forwarded-for` value (leftmost values can be spoofed by the client), then `x-real-ip`. Only enable `TRUST_PROXY` when the proxy overwrites these headers, otherwise clients could spoof their IP.

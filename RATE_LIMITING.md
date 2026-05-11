# Rate Limiting Guide

## Overview
Rate limiting has been added to prevent abuse while allowing normal usage.

### Configuration
- **Default: 60 requests per minute** per user/IP
- This allows ~1 request/second, suitable for:
  - Normal voting/judging operations
  - Fetching data
  - Form submissions
  - Prevents bot spam and DoS attacks

## Usage

### Apply to a single endpoint:

```typescript
import { applyRateLimit } from '~/server/utils/rateLimit'

export default defineEventHandler(
  applyRateLimit(async (event) => {
    // Your handler code
  })
)
```

### Apply with custom limits:

```typescript
export default defineEventHandler(
  applyRateLimit(
    async (event) => {
      // Your handler code
    },
    { maxRequests: 30, windowMs: 60 * 1000 } // 30 per minute
  )
)
```

## How It Works

1. **Identifier**: Uses user ID if authenticated, IP address if not
2. **Sliding Window**: Tracks timestamps of requests in a Map
3. **Response**: Returns 429 status with `Retry-After` header
4. **Memory Management**: Auto-cleans requests older than 1 hour

## Response Example

When limit is exceeded:

```json
{
  "statusCode": 429,
  "statusMessage": "Too Many Requests",
  "data": {
    "message": "Rate limit exceeded. Max 60 requests per 60s.",
    "retryAfter": 45,
    "resetTime": "2026-03-28T12:34:56.789Z"
  }
}
```

Headers also include: `Retry-After: 45`

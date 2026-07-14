---
title: Security Considerations
description: Security measures and best practices in the basishacks platform
---

# Security Considerations

The basishacks platform implements multiple layers of security to protect user data, prevent abuse, and ensure safe operation across all deployment environments.

## HTTP Security Headers

Every response from the Nitro server includes a baseline set of security headers, set by `server/middleware/security-headers.ts`:

| Header | Value |
| --- | --- |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), ambient-light-sensor=(), autoplay=(), encrypted-media=(), picture-in-picture=()` |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' blob: data:; connect-src 'self' https://login.microsoftonline.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` |

The middleware runs for API routes, rendered HTML pages, and static assets. The `'unsafe-inline'` source expression is required for `script-src` because Nuxt SSR hydration injects `window.__NUXT__` as an inline script, and for `style-src` because Vue and Nuxt UI components apply inline style bindings. The `'unsafe-eval'` source expression is intentionally omitted.

## Security-Critical Environment Variables

The following environment variables directly affect platform security and must be configured carefully in production:

| Variable | Requirement | Purpose |
| --- | --- | --- |
| `NUXT_SESSION_PASSWORD` | At least 32 bytes | Encryption key for session cookies managed by `nuxt-auth-utils` |
| `NUXT_OAUTH2_JWT_SECRET` | At least 32 bytes | Signing key for OAuth2 access tokens |
| `TRUST_PROXY` | Set only when behind a trusted reverse proxy | Enables use of the `x-forwarded-for` header for client IP identification in rate limiting |
| `MICROSOFT_TENANT_ID` | Valid Microsoft Entra ID tenant | Required for Microsoft Graph API integration |
| `MICROSOFT_CLIENT_ID` | Valid Microsoft Entra ID application ID | Required for Microsoft Graph API integration |
| `MICROSOFT_CLIENT_SECRET` | Valid client secret | Used for the client credentials token flow in `server/plugins/microsoft.ts` |

## Rate Limiting

All API endpoints are protected by an in-memory rate limiter. Sensitive routes consume requests from dedicated buckets:

| Bucket           | Default                | Routes                                 |
| ---------------- | ---------------------- | -------------------------------------- |
| General API      | 6000 requests / minute | All non-sensitive API routes           |
| Authentication   | 600 requests / minute  | `/api/login`, `/api/oauth2/*`          |
| Voting / scoring | 600 requests / minute  | `/api/ballot`, `/api/teams/:id/scores` |
| File upload      | 600 requests / minute  | `/api/debug/upload`                    |

- **Client identification:** Authenticated users are identified by `user:{id}`; unauthenticated requests by `ip:{ip}`
- **Response:** 429 status with `Retry-After` header
- **Configuration:** Override defaults via `RATE_LIMIT_GENERAL_MAX`, `RATE_LIMIT_AUTH_MAX`, `RATE_LIMIT_VOTE_MAX`, `RATE_LIMIT_UPLOAD_MAX`, and `RATE_LIMIT_WINDOW_MS`
- **Cleanup:** Interval-based cleanup runs at most once every 5 minutes and removes entries with no requests in the last hour

::: warning Rate limiting is in-memory and per-process. Under high concurrency or with multiple server instances, the effective rate limit applies separately to each process. :::

See [Rate Limiting](./rate-limiting.md) for full details.

## Debug Route Lockdown

All `/api/debug/*` routes and both `/debug` pages require an administrator or an appropriately scoped developer permission. In production, debug utilities can be disabled entirely by setting:

```bash
DISABLE_DEBUG_ROUTES=true
```

When this variable is truthy, requests to `/api/debug/*` or `/debug*` return `404 Not Found` before any route handler executes. This guard is enforced by `server/middleware/debug-lockdown.ts` and operates independently of route-level permission checks.

## Session Security

- **Session password** (`NUXT_SESSION_PASSWORD`) must be at least 32 bytes.
- Sessions are managed by `nuxt-auth-utils` with encrypted cookies.
- Session cookies are issued with `httpOnly: true`, `sameSite: "lax"`, and `secure: true` in production.
- The OAuth2 `bridge_id` and `bridge_error` cookies use `httpOnly: true`, `secure: true`, and `sameSite: "lax"`.
- The session cookie stores only `{ user: { id: number } }`; no sensitive data is stored client-side.
- The full user record is fetched from the database on every authenticated request.

## Database Security

- **Foreign keys** are enforced with `PRAGMA foreign_keys = ON`.
- All database access goes through Drizzle ORM (`event.context.drizzle.select()/insert()/update()/delete()`); no raw string interpolation is used.
- User input is bound as query parameters; SQL metacharacters such as `' OR 1=1 --` or `'; DROP TABLE users; --` are treated as literal values and cannot alter query logic.
- Raw SQL exists only in `server/database/migrate.ts` and `server/database/index.ts` for schema setup, migrations, and PRAGMAs; these statements use hardcoded identifiers and constants, never user input.
- Regression tests in `tests/api/sql-injection.test.ts` exercise endpoints and database helpers with SQL metacharacters to verify they are stored and matched as literals.
- The database layer uses Drizzle ORM with `bun:sqlite` under Bun and `better-sqlite3` under Node.js, ensuring consistent behavior between local and production environments.

## Input Validation

- **Zod validation** is performed on every API endpoint using `readValidatedBody(event, Schema.parse)` or `getValidatedQuery(event, Schema.parse)`
- Shared schemas in `shared/schemas.ts` are the single source of truth for input constraints
- Validation errors return structured 400 responses

## Role-Based Access Control (RBAC)

- RBAC is enforced **server-side**; the frontend never performs permission checks for authorization.
- Three helper functions enforce access:
    - `requireUser(event)` — returns the full database user row or `401 Unauthorized`.
    - `requireJudge(event)` — returns `403 Forbidden` if the caller is not a judge or administrator.
    - `requireAdmin(event)` — returns `403 Forbidden` if the caller is not an administrator.
- Fine-grained permissions are checked using `hasPermission(user.role, permission)` from `shared/permissions.ts`.
- The `role` column stores space-separated, URI-encoded permission strings.

::: danger Never trust the frontend for permission checks. Always validate on the server. :::

## Microsoft Graph API

- All Microsoft Graph API calls are centralized in `server/plugins/microsoft.ts` for auditability
- The Microsoft OAuth2 configuration reads the Entra ID tenant and client ID from the `MICROSOFT_TENANT_ID` and `MICROSOFT_CLIENT_ID` environment variables
- Client ID and tenant are defined in `server/utils/oauth2.ts`; if either env var is missing, Microsoft Graph features are disabled gracefully

## OAuth2 Client Secret Storage

Client secrets are **never stored in plaintext**. Instead:

1. When a new secret is generated, it is created using `crypto.randomBytes(32).toString('hex')`
2. The plain secret is hashed with **SHA-256** before storage: `createHash('sha256').update(plainSecret).digest('hex')`
3. Multiple secrets can be stored per application, space-separated in the `client_secret` column
4. Only the abbreviated hash (`sha256:XXXXXXXX...XXXXXXXX`) is shown in the UI
5. The plain secret is shown **only once** at creation time and cannot be recovered

```ts
// Secret creation
const plainSecret = randomBytes(32).toString("hex");
const secretHash = createHash("sha256").update(plainSecret).digest("hex");

// Secret validation
const hash = createHash("sha256").update(plainSecret).digest("hex");
if (part === hash) return true;
```

## JWT Tokens

OAuth2 access tokens are signed JWTs with the following properties:

- **Algorithm:** HS256 (HMAC with SHA-256)
- **Signing key:** `NUXT_OAUTH2_JWT_SECRET` environment variable
- **Key length:** Must be at least 32 bytes
- **Expiration:** 1 hour (`setExpirationTime('1h')`)
- **Issuer:** `basishacks`
- **Audience:** The application's `client_id`
- **Payload claims:** `sub`, `user_id`, `client_id`, `redirect_uri`, `scope`

At startup, the server validates `NUXT_OAUTH2_JWT_SECRET` in `server/plugins/validate-oauth2-jwt-secret.ts`. In production, a missing or too-short secret causes a fatal error and immediate shutdown. In development and test environments, a dev-only fallback is applied with a prominent warning so local work can continue, but this fallback must never be used in production.

```ts
const jwt = await new SignJWT({
    sub: String(session.user.id),
    user_id: session.user.id,
    client_id: session.application.client_id,
    redirect_uri: session.redirect_uri,
    scope: session.scopes.join(" "),
})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(getOAuth2Issuer()) // CURRENT_URL_ORIGIN
    .setAudience(session.application.client_id)
    .setIssuedAt(Date.now())
    .setExpirationTime("1h")
    .sign(key);
```

Token verification uses `jose.jwtVerify()` with the same secret in `server/utils/oauth2-jwt.ts`.

## PKCE Support

The OAuth2 authorization flow requires **Proof Key for Code Exchange (PKCE)**. Authorization requests that omit `code_challenge` or `code_challenge_method` are rejected with a 400 `invalid_request: PKCE required` response.

- Clients must provide `code_challenge` and `code_challenge_method` parameters during authorization
- Supported methods: `S256` (SHA-256 hash of the code verifier, base64url-encoded) and `plain`
- During token exchange, the `code_verifier` is verified against the stored challenge:

```ts
if (session.bh_verifier_challenge_method === "S256") {
    const hash = createHash("sha256").update(codeVerifier).digest("base64url");
    verified = hash === session.bh_verifier_challenge;
} else {
    verified = codeVerifier === session.bh_verifier_challenge;
}
```

- PKCE is mandatory for all clients, including confidential clients

## Sensitive Scope Consent

When an application requests a scope marked as `sensitive: true` in `shared/oauth2-scopes.ts`, the authorization flow requires **explicit user consent**:

1. The user is redirected to a consent page
2. The user can approve (`consent`), deny (`deny`), or cancel (`cancel`)
3. Only after consent is the authorization code issued

This prevents applications from silently accessing sensitive user data such as chat messages or all meetings.

---

<QuoteCycler />

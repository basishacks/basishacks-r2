---
title: Security Considerations
description: Security measures and best practices in the basishacks platform
---

# Security Considerations

The basishacks platform implements multiple layers of security to protect user data, prevent abuse, and ensure safe operation.

## Rate Limiting

All API endpoints are protected by an in-memory rate limiter:

- **Default limit:** 60 requests per 60,000 ms (1 minute)
- **Client identification:** Authenticated users are identified by `user:{id}`; unauthenticated requests by `ip:{ip}`
- **Response:** 429 status with `Retry-After` header
- **Cleanup:** 1% probabilistic cleanup of entries older than 1 hour

::: warning Rate limiting is in-memory and per-process. Under high concurrency or with multiple server instances, a determined attacker could potentially bypass per-IP limits by distributing requests across many IPs. :::

See [Rate Limiting](./rate-limiting.md) for full details.

## Session Security

- **Session password** (`NUXT_SESSION_PASSWORD`) must be at least 32 bytes
- Sessions are managed by `nuxt-auth-utils` with encrypted cookies
- The session cookie stores only `{ user: { id: number } }` — no sensitive data is stored client-side
- The full user record is fetched from the database on each authenticated request

## Database Security

- **Foreign keys** are enforced with `PRAGMA foreign_keys = ON`
- All database access goes through Drizzle ORM (`event.context.drizzle.select()/insert()/update()/delete()`) — no raw string interpolation
- The database layer uses Drizzle ORM with `bun:sqlite` under Bun and `better-sqlite3` under Node.js, ensuring consistent behavior between local and production environments

## Input Validation

- **Zod validation** is performed on every API endpoint using `readValidatedBody(event, Schema.parse)` or `getValidatedQuery(event, Schema.parse)`
- Shared schemas in `shared/schemas.ts` are the single source of truth for input constraints
- Validation errors return structured 400 responses

## Role-Based Access Control (RBAC)

- RBAC is enforced **server-side** — the frontend never performs permission checks for authorization
- Three helper functions enforce access:
    - `requireUser(event)` — returns the full DB user row or 401
    - `requireJudge(event)` — 403 if not judge/admin
    - `requireAdmin(event)` — 403 if not admin
- Fine-grained permissions are checked using `hasPermission(user.role, DevPermissions.XXX)`
- The `role` column stores space-separated URI-encoded permission strings

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
    scope: session.scopes,
})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(getOAuth2Issuer()) // CURRENT_URL_ORIGIN
    .setAudience(session.application.client_id)
    .setIssuedAt(Date.now())
    .setExpirationTime("1h")
    .sign(key);
```

Token verification uses `jose.jwtVerify()` with the same secret.

## PKCE Support

The OAuth2 authorization flow supports **Proof Key for Code Exchange (PKCE)**:

- Clients can provide `code_challenge` and `code_challenge_method` parameters during authorization
- Supported method: `S256` (SHA-256 hash of the code verifier, base64url-encoded)
- During token exchange, the `code_verifier` is verified against the stored challenge:

```ts
if (session.bh_verifier_challenge_method === "S256") {
    const hash = createHash("sha256").update(codeVerifier).digest("base64url");
    verified = hash === session.bh_verifier_challenge;
}
```

- If PKCE parameters are not provided, the flow falls back to protocol version 2.0 (legacy mode)
- PKCE is strongly recommended for public clients (SPAs, mobile apps)

## Sensitive Scope Consent

When an application requests a scope marked as `sensitive: true` in `shared/oauth2-scopes.ts`, the authorization flow requires **explicit user consent**:

1. The user is redirected to a consent page
2. The user can approve (`consent`), deny (`deny`), or cancel (`cancel`)
3. Only after consent is the authorization code issued

This prevents applications from silently accessing sensitive user data such as chat messages or all meetings.

---

<QuoteCycler />

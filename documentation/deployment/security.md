---
title: Security Considerations
description: Security measures and best practices in the basishacks platform
---

# Security Considerations

The basishacks platform implements multiple layers of security to protect user data, prevent abuse, and ensure safe operation across all deployment environments.

## HTTP Security Headers

Every response from the Nitro server includes a baseline set of **6 security headers**, set by `server/middleware/security-headers.ts`:

| Header | Value |
| --- | --- |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), autoplay=(), encrypted-media=(), picture-in-picture=()` |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' blob: data:; connect-src 'self' https://login.microsoftonline.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` |

The `Content-Security-Policy` header includes **10 directives** that restrict resource loading to same-origin sources by default, with allowances for Nuxt SSR hydration scripts, Vue inline styles, font files, image blobs and data URIs, and Microsoft login connectivity.

The middleware runs for API routes, rendered HTML pages, and static assets. The `'unsafe-inline'` source expression is required for `script-src` because Nuxt SSR hydration injects `window.__NUXT__` as an inline script, and for `style-src` because Vue and Nuxt UI components apply inline style bindings. The `'unsafe-eval'` source expression is intentionally omitted.

## Security-Critical Environment Variables

The following environment variables directly affect platform security and must be configured carefully in production:

| Variable | Requirement | Purpose |
| --- | --- | --- |
| `NUXT_SESSION_PASSWORD` | At least 32 bytes | Encryption key for session cookies managed by `nuxt-auth-utils` |
| `BASIS_AUTH_CLIENT_SECRET` | Provider-generated confidential value | Authenticates basishacks at the basis-auth token endpoint |
| `BASIS_AUTH_ISSUER` | Exact trusted issuer | Discovery and issuer validation |
| `BASIS_AUTH_RESOURCE` | Exact registered audience | Resource-token audience validation |
| `TRUST_PROXY` | Set only when behind a trusted reverse proxy | Enables use of the `x-forwarded-for` header for client IP identification in rate limiting |
| `MICROSOFT_TENANT_ID` | Valid Microsoft Entra ID tenant | Required for Microsoft Graph API integration |
| `MICROSOFT_CLIENT_ID` | Valid Microsoft Entra ID application ID | Required for Microsoft Graph API integration |
| `MICROSOFT_CLIENT_SECRET` | Valid client secret | Used for the client credentials token flow in `server/plugins/microsoft.ts` |

## Rate Limiting

All API endpoints are protected by an in-memory rate limiter. Sensitive routes consume requests from dedicated buckets:

| Bucket           | Default                | Routes                                   |
| ---------------- | ---------------------- | ---------------------------------------- |
| General API      | 6000 requests / minute | All non-sensitive API routes             |
| Authentication   | 600 requests / minute  | `/api/login`, `/api/auth/basis/callback` |
| Voting / scoring | 600 requests / minute  | `/api/ballot`, `/api/teams/:id/scores`   |
| File upload      | 600 requests / minute  | `/api/debug/upload`                      |

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
- The separate basis-auth transaction session contains state, nonce, PKCE verifier, and a safe relative redirect. It is HTTP-only, encrypted, SameSite=Lax, secure in production, and limited to **10 minutes**.
- The session cookie stores only `{ user: { id: number } }`; no sensitive data is stored client-side.
- The full user record is fetched from the database on every authenticated request.

### Startup Validation

Critical authentication configuration is validated at server startup in `server/plugins/validate-environment.ts`:

| Variable | Validation | Production Behavior | Non-Production Behavior |
| --- | --- | --- | --- |
| `NUXT_SESSION_PASSWORD` | Must be set and at least 32 bytes (UTF-8 encoded) | `process.exit(1)` with fatal error message | Stderr warning, continues |
| `BASIS_AUTH_ISSUER`, `BASIS_AUTH_CLIENT_ID`, `BASIS_AUTH_CLIENT_SECRET`, `BASIS_AUTH_RESOURCE` | All must be set | Fatal startup error when any is missing | Warning; login unavailable until configured |
| `MICROSOFT_*` env vars | All three must be set for Graph features | Warning if partially configured | Warning if partially configured |

Resource access tokens are verified against basis-auth JWKS and are never signed by basishacks.

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

## Server-Side URL Validation (SSRF Protection)

External URLs fetched by the server are validated through `server/utils/url-validation.ts` to prevent Server-Side Request Forgery (SSRF) attacks:

- Only `http:` and `https:` protocols are allowed; other protocols (`file:`, `ftp:`, etc.) are rejected
- Private and loopback IP ranges are blocked: `10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`, `127.x.x.x`, `169.254.x.x`, `0.x.x.x`, multicast (`224-239.x.x.x`), IPv6 link-local (`fe8:`/`fe9:`/`fea:`/`feb:`), unique-local (`fc:`/`fd:`), IPv6 loopback (`::1`), and `localhost`
- DNS rebinding protection is applied at fetch time — every redirect hop is re-validated through `validateExternalUrl()`
- A maximum of **5 redirects** is enforced with `redirect: "manual"` to prevent open-redirect chains
- Response body is capped at **15 KB**

```ts
export function validateExternalUrl(urlString: string): URL {
    const url = new URL(urlString);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw ...;
    if (isPrivateHost(url.hostname)) throw ...;
    return url;
}
```

## Open Redirect Prevention

All redirect parameters in the login flow are validated to prevent open redirect attacks:

- **`login.get.ts`** — The `postLoginRedirect` parameter is allowed only when it does not start with `http://`, `https://`, or `//` (protocol-relative). Only relative paths are accepted.
- **`dccallback.get.ts`** — The OAuth2 onsite login callback validates redirects before following them, ensuring they point to relative paths only.
- **`SafeLink.vue`** — User-provided links in rendered content (e.g. project descriptions) are rendered through the `SafeLink` component, which validates URLs with `isSafeUrl()` — only relative paths rooted at `/` and `http:`/`https:` URLs are rendered as clickable links; unsafe URLs are shown as plain strikethrough text.
- **`SafeComark.vue`** — Markdown content rendered from user input uses the `SafeLink` component as its link renderer via `Comark`, and HTML rendering is disabled.

## Unified Client Credential Errors

The OAuth2 token endpoint (`token.post.ts`) returns a single, generic `"Invalid client credentials"` error for all token exchange failures — whether the client ID is unknown, the secret is wrong, or both. This prevents **user enumeration** through error message differences:

```ts
if (!app || !isSecretValid) {
    throw createError({
        statusCode: 400,
        statusMessage: "invalid_client",
        message: "Invalid client credentials", // Same message for every failure
    });
}
```

## Audit Logging for Admin Impersonation

Admin impersonation events (`api/auth/impersonate.post.ts`) are logged with a structured `[AUDIT]` prefix for monitoring and forensic analysis:

```
[AUDIT] Admin 42 (admin@example.com) impersonated user 17 (target@basischina.com)
```

The log line includes both the admin's ID/email and the target user's ID/email. The log output can be captured by standard server logging infrastructure (journald, systemd, log files) for SIEM integration.

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

## Resource Access Tokens

Protected basishacks APIs accept basis-auth access tokens with the following required properties:

- **Signature:** basis-auth JWKS, RS256 only
- **Issuer:** exact `BASIS_AUTH_ISSUER`
- **Audience:** exact `BASIS_AUTH_RESOURCE`
- **Type:** `at+jwt`
- **Lifetime:** token must be unexpired
- **Claims:** string `sub`, `client_id`, and `scope`

Token verification uses `jose.jwtVerify()` and a remotely refreshed basis-auth JWKS. The stable `sub` is mapped through `users.auth_issuer` and `users.auth_subject`.

## PKCE Support

The basis-auth browser flow always generates a fresh verifier and sends an S256 challenge. The verifier, state, and nonce remain only in the encrypted short-lived transaction session, and `openid-client` validates all three during callback processing.

## Sensitive Scope Consent

When an application requests a scope marked as `sensitive: true` in `shared/oauth2-scopes.ts`, the authorization flow requires **explicit user consent**:

1. The user is redirected to a consent page
2. The user can approve (`consent`), deny (`deny`), or cancel (`cancel`)
3. Only after consent is the authorization code issued

This prevents applications from silently accessing sensitive user data such as chat messages or all meetings.

---

## XSS Prevention Audit

A comprehensive XSS audit has been performed across all frontend components (`app/` directory, 50+ `.vue`/`.ts` files):

- **No `v-html` usage**: zero instances. All user-controlled text renders through Vue's auto-escaping `{{ }}` interpolation.
- **No `innerHTML`** or `dangerouslySetInnerHTML`: zero instances.
- **SafeLink component**: validates all `href` attributes via `isSafeUrl()` before rendering; unsafe URLs render as inert `<span>` elements.
- **SafeComark component**: renders user project descriptions with HTML escaping before Markdown processing.
- **URL safety**: all project demo/repo URLs use `safeUrl()` computed properties; file upload URLs use sanitized UUID-based filenames.
- **Form maxlength attributes**: all key form inputs (`ProjectForm.vue`, `JudgingCard.vue`, `voting.vue`) now have `:maxlength` bound to the `MAX_*` constants from `shared/schemas.ts`, preventing users from exceeding validation limits before submission.

**Result: Zero XSS vectors found.** The frontend is fully hardened against cross-site scripting attacks.

---

<QuoteCycler />

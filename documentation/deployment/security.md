# Security

## Authentication Security

### Session Management

- Sessions use `nuxt-auth-utils` with encrypted cookies
- Session password (`NUXT_SESSION_PASSWORD`) must be at least 32 bytes
- Max session age: 30 days
- Session cookie stores only `{ user: { id: number } }` — no sensitive data

### Magic Code Authentication

- 6-digit codes with 10-minute expiry
- Codes are single-use (cleared after successful verification)
- 1-minute cooldown between code requests (admins exempt)
- Codes are sent via an external webhook, not stored in logs

### Microsoft OAuth2

- Uses PKCE (Proof Key for Code Exchange) to prevent authorization code interception
- State parameter prevents CSRF attacks
- Tenant-restricted to `cbc6e1e2-a6bb-4002-bbdc-6da892a051a7`

## Authorization Security

### Server-Side Enforcement

All authorization is enforced server-side using helpers in `server/utils/auth.ts`:

- `requireUser(event)` — 401 if not authenticated
- `requireJudge(event)` — 403 if not judge/admin
- `requireAdmin(event)` — 403 if not admin
- `requirePermission(event, permission)` — 403 if lacking permission (admin bypasses)

::: danger
Client-side permission checks are for UI purposes only. Never trust the frontend for authorization decisions.
:::

### Permission System

- Fine-grained dot-notation permissions stored in the `role` field
- Admin role implicitly grants all permissions
- OAuth2 scopes are validated against application permissions
- Admin-only scopes require admin privileges to assign

## Input Validation

- All API endpoints validate input using Zod schemas from `shared/schemas.ts`
- `readValidatedBody(event, Schema.parse)` or `getValidatedQuery(event, Schema.parse)` is mandatory
- Email validation enforces `@basischina.com` domain
- File uploads are validated for size (10MB max) and type (JPEG, PNG, WebP only)
- Redirect URIs must start with `https://` or `http://localhost`

## Database Security

- Foreign keys are enforced (`PRAGMA foreign_keys = ON`)
- WAL mode provides better concurrency and crash recovery
- Parameterized queries prevent SQL injection (all DB access uses `prepare().bind()`)
- Cascading deletes are handled manually to ensure data integrity

## OAuth2 Security

### Client Secrets

- Secrets are stored as SHA-256 hashes, never in plaintext
- Plain-text secrets are only shown once at creation time
- Abbreviated display format prevents full hash exposure
- Legacy plaintext support exists for backward compatibility

### PKCE Support

The OAuth2 authorization flow supports PKCE (Proof Key for Code Exchange):
- `code_challenge` and `code_challenge_method` parameters in authorization requests
- `code_verifier` parameter in token exchange
- Falls back to protocol 2.0 (no PKCE) if challenge parameters are missing

### Redirect URI Validation

- Redirect URIs must be explicitly registered for each application
- Only `https://` and `http://localhost` schemes are allowed
- URI matching is exact (no pattern matching)

### JWT Tokens

- Signed with `HS256` using `NUXT_OAUTH2_JWT_SECRET`
- 1-hour expiration
- Scope validation on protected endpoints
- Bearer token extraction with proper header validation

## Rate Limiting

- Default: 60 requests per minute per client
- Client identification: user ID (authenticated) or IP address (unauthenticated)
- Stricter limits on sensitive endpoints (e.g., 10/min for profile updates)
- In-memory storage (per-instance in production)

::: warning
Rate limiting is in-memory and per-instance. In production on Cloudflare Pages, the limit is per isolate, not globally distributed.
:::

## Known Security Considerations

1. **In-memory OAuth2 sessions**: Authorize sessions are stored in memory and lost on server restart. In production, each Cloudflare isolate has separate session storage.

2. **File system writes**: The `createAsset`/`createUserAsset` functions write to the local file system, which is read-only in Cloudflare Pages production.

3. **Rate limiting per-isolate**: In production, rate limits are enforced per Cloudflare isolate, not globally.

4. **DELETE /api/applications**: The authentication check appears to be incomplete (commented out `requirePermission`), potentially allowing unauthorized deletions.

5. **Microsoft ROPC flow**: The dummy user authentication uses Resource Owner Password Credentials, which is less secure than other flows. Microsoft recommends against ROPC in production.

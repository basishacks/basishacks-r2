---
title: Authentication & Authorization
description: How basishacks handles user authentication (Microsoft OAuth2, basishacks connect) and authorization (RBAC with fine-grained permissions).
---

# Authentication & Authorization

basishacks supports two authentication methods and a fine-grained permission system that extends beyond simple role checks.

## Authentication Methods

### 1. Microsoft OAuth2

Delegates authentication to Microsoft Entra ID (Azure AD). This is the **only** login method for the hackathon registry; the legacy email-verification-code flow has been removed.

- **Tenant**: read from the `MICROSOFT_TENANT_ID` environment variable
- **Client ID**: read from the `MICROSOFT_CLIENT_ID` environment variable
- **Client Secret**: read from `MICROSOFT_CLIENT_SECRET` for the token exchange
- **Scopes**: `openid profile email`
- **Redirect URI**: `/api/oauth2/mscallback` (alias also exposed at `/api/auth`)
- **PKCE**: Enforced with the `S256` code challenge method

The hardened flow works as follows:

1. The authorize middleware generates a cryptographically random `state` value and a PKCE `code_verifier`, then stores them in the in-memory authorization session.
2. The user is redirected to Microsoft's authorization endpoint with `response_type=code`, `code_challenge`, `code_challenge_method=S256`, and `state`.
3. Microsoft redirects back to `/api/oauth2/mscallback` with an authorization `code` and the same `state`.
4. The callback validates that the returned `state` matches the session, rejects the request if it does not, and exchanges the code using the original PKCE `code_verifier`.
5. The user's profile is extracted from the Microsoft ID token, and `createUserFromMicrosoftProfile` creates or updates the local user record.
6. The basishacks session cookie is established with `httpOnly`, `secure`, `sameSite: "lax"` flags and the user is redirected to the post-login destination.

::: danger PKCE enforcement PKCE is **mandatory** with `code_challenge_method=S256` only. The `plain` method is rejected at the validation layer per RFC 7636 §4.4.2. All authorization requests without PKCE or with `plain` method receive a `invalid_request: code_challenge_method must be S256` error. :::

### 2. basishacks connect (onsite OAuth2 application)

A custom OAuth2 integration used by the first-party application identified by `ONSITE_LOGIN_CLIENT_ID`. The typical site login path is:

```
/api/login  →  /api/oauth2/authorize  →  Microsoft OAuth2  →  /api/oauth2/mscallback  →  /api/oauth2/dccallback
```

`/api/login` constructs a full OAuth2 + PKCE authorization request against basishacks itself, sets a short-lived `pkce_verifier` cookie, and redirects to `/api/oauth2/authorize`. Because the onsite application is a normal OAuth2 application, it is subject to the same state validation and PKCE enforcement as third-party clients.

See [OAuth2 System](./oauth2) for full details on the authorization code flow.

### Login rate limiting

The `/api/login` endpoint is rate-limited using `AUTH_RATE_LIMIT_CONFIG` (default: 600 requests per minute, configurable via `RATE_LIMIT_AUTH_MAX`). This prevents brute-force attempts against the Microsoft OAuth2 redirect.

### Open redirect prevention

The `redirect` query parameter in `/api/login` is validated to prevent open redirect attacks:

- Only relative paths are accepted (no `http://`, `https://`, or protocol-relative `//` prefixes).
- The same check applies to the `redirect` parameter in `/api/oauth2/dccallback`.

## Auth Endpoints

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/login` | GET | Initiates the basishacks connect OAuth2 flow and redirects to `/api/oauth2/authorize` |
| `/api/auth` | GET | Alias for `/api/oauth2/mscallback` (supports Azure App Registrations that use `/api/auth` as the redirect URI) |
| `/api/auth/impersonate` | POST | Replaces the current session with the target user's session (admin only) |

## Session Management

### nuxt-auth-utils session

Sessions are handled by `nuxt-auth-utils`:

| Property | Value                                   |
| -------- | --------------------------------------- |
| Storage  | Encrypted cookie                        |
| Content  | `{ user: { id: number } }`              |
| Max age  | 30 days (`30 * 24 * 60 * 60` seconds)   |
| Password | `NUXT_SESSION_PASSWORD` (>= 32 bytes)   |
| Cookie   | `httpOnly`, `secure`, `sameSite: "lax"` |

The session stores only the user ID. The full user record is fetched from the database on every authenticated request via `requireUser()`.

### OAuth2 authorization session state machine

The OAuth2 authorization flow uses a state machine with four states, stored in the in-memory `AuthorizeSession`:

| State            | Meaning                                                          |
| ---------------- | ---------------------------------------------------------------- |
| `identification` | Application identified; user needs to authenticate               |
| `requesting`     | External authentication in progress (e.g., Microsoft OAuth2)     |
| `consent`        | User authenticated; awaiting explicit consent (sensitive scopes) |
| `completed`      | Authorization code generated; awaiting token exchange            |

Transitions:

1. `identification` → `requesting` — user is redirected to Microsoft login
2. `requesting` → `consent` — Microsoft callback received, user authenticated
3. `consent` → `completed` — user grants consent, authorization code generated
4. `identification` → `completed` — direct completion without sensitive scopes

Sessions expire after 10 minutes with a `bridge_id` cookie (httpOnly, secure, sameSite: lax).

### Session type augmentation

```ts
// shared/auth.d.ts
declare module "#auth-utils" {
    interface User {
        id: number;
    }
}
```

## Authorization

### Role enforcement helpers

Four helpers in `server/utils/auth.ts` enforce access control:

| Helper | Behavior |
| --- | --- |
| `requireUser(event)` | Returns the full DB user row or throws 401 |
| `requireJudge(event)` | Throws 403 if user lacks `judge` or `admin` permission |
| `requireAdmin(event)` | Throws 403 if user lacks `admin` permission |
| `requirePermission(event, permission)` | Throws 403 if user lacks the specified permission (admin always passes) |

```ts
// Example usage in an API handler
export default defineEventHandler(async (event) => {
    const user = await requireUser(event); // 401 if not logged in
    // ...
});

export default defineEventHandler(async (event) => {
    await requireAdmin(event); // 403 if not admin
    // ...
});

export default defineEventHandler(async (event) => {
    await requirePermission(event, "portal.users.view"); // 403 if not permitted
    // ...
});
```

### Fine-grained permissions

The `users.role` column stores **space-separated permission strings** rather than a single role value. This allows granular access control:

```
participant portal.users.view portal.teams.view portal.debug.view
```

The permission system is defined in `shared/permissions.ts`:

```ts
export const VotePermissions = {
    VOTE: "sc.vote",
} as const;

export const DevPermissions = {
    USERS: "dev_users",
    TEAMS: "dev_teams",
    DEBUG: "dev_debug",
    DEEPSEEK: "dev_deepseek",
    PORTAL_USERS_VIEW: "portal.users.view",
    PORTAL_DEBUG_VIEW: "portal.debug.view",
    PORTAL_TEAMS_VIEW: "portal.teams.view",
    PORTAL_DEEPSEEK_VIEW: "portal.deepseek.view",
    PORTAL_APPLICATIONS_VIEW: "portal.applications.view",
    PORTAL_APPLICATIONS_CREATE: "portal.applications.create",
    PORTAL_APPLICATIONS_CREATE_FIRST_PARTY: "portal.applications.create.firstparty",
    PORTAL_APPLICATIONS_DELETE: "portal.applications.delete",
    PORTAL_APPLICATIONS_VIEW_ALL: "portal.applications.view.all",
    PORTAL_SEASONS_VIEW: "portal.seasons.view",
    PORTAL_SEASONS_EDIT: "portal.seasons.edit",
} as const;
```

### Permission helpers

```ts
// Parse a role string into an array of permissions
parsePermissions(role: string | null | undefined): string[]

// Check if a role string includes a specific permission
hasPermission(role: string | null | undefined, permission: string): boolean

// Add a permission to a role string
addPermission(role: string | null | undefined, permission: string): string

// Remove a permission from a role string
removePermission(role: string | null | undefined, permission: string): string
```

::: warning Permissions are URI-encoded when stored (e.g., `portal.users.view` becomes `portal.users.view` — dots are preserved). The `parsePermissions` function decodes each segment. :::

### Admin bypass

The `admin` permission always passes all permission checks. This is enforced in both `requirePermission()` and `requireJudge()`:

```ts
export async function requirePermission(event: H3Event, permission: string) {
    const user = await requireUser(event);
    if (!hasPermission(user.role, permission) && !hasPermission(user.role, "admin")) {
        throw createError({ status: 403, message: "Insufficient permissions" });
    }
    return user;
}
```

### JWT validation middleware

OAuth2 JWT Bearer tokens are validated by `oauth2-jwt.ts` utilities:

- `verifyAccessToken(token)` — Verifies a JWT against `NUXT_OAUTH2_JWT_SECRET` using the `jose` library. Throws 401 for invalid or expired tokens.
- `extractBearerToken(event)` — Extracts the Bearer token from the `Authorization` header. Throws 401 if missing.
- `requireScopes(grantedScopes, requiredScopes)` — Throws 403 with `insufficient_scope` if any required scope is missing.
- `withOAuth2JWT(handler, options)` — High-level wrapper that handles extraction, verification, scope checking, and optional user loading.

The `NUXT_OAUTH2_JWT_SECRET` is validated at startup by the `validate-environment.ts` plugin (>= 32 bytes, otherwise the process exits).

### Migration from simple roles

The original schema had a `CHECK` constraint limiting `users.role` to `participant`, `judge`, or `admin`. This was removed via `migration-permissions.sql` which recreated the `users` table without the constraint:

```sql
-- migration-permissions.sql
CREATE TABLE users_new (
    -- ... same columns ...
    role TEXT NOT NULL DEFAULT 'participant',  -- no CHECK constraint
    -- ...
);
INSERT INTO users_new SELECT * FROM users;
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;
```

## Impersonation

Admins can impersonate other users via a dedicated endpoint:

```
POST /api/auth/impersonate
Body: { userId: number }
Authorization: requires admin
```

This sets the session to the target user's ID, allowing admins to debug issues from the user's perspective. The impersonation is permanent until the admin logs out or impersonates another user.

### Audit logging

Every impersonation event is logged via `console.log` with the `[AUDIT]` prefix:

```ts
console.log(
    `[AUDIT] Admin ${admin.id} (${admin.email}) impersonated user ${targetUser.id} (${targetUser.email})`,
);
```

This provides a server-side audit trail of all impersonation activity. Logs include both the admin's and target user's ID and email, and are visible in the server's stdout and log capture.

::: warning Impersonation completely replaces the session. There is no "return to admin" mechanism — the admin must log in again. :::

---
title: Authentication & Authorization
description: How basishacks handles user authentication (magic code, Microsoft OAuth2, basishacks connect) and authorization (RBAC with fine-grained permissions).
---

# Authentication & Authorization

basishacks supports three authentication methods and a fine-grained permission system that extends beyond simple role checks.

## Authentication Methods

### 1. Magic Code

The primary authentication method for participants:

1. User enters their `@basischina.com` email
2. Server generates a 6-digit PIN code (valid for 10 minutes)
3. PIN is sent to the user via an external webhook (Microsoft Teams message)
4. User submits email + PIN to exchange for a session

```ts
// Step 1: Request a code
POST /api/auth/code
Body: { email: "user@basischina.com" }

// Step 2: Verify the code and establish session
POST /api/auth/login
Body: { email: "user@basischina.com", code: "123456" }
```

::: tip
Admins can request codes more frequently (bypassing the 1-minute cooldown) for testing purposes.
:::

### 2. Microsoft OAuth2

Delegates authentication to Microsoft Entra ID (Azure AD):

- **Tenant**: `cbc6e1e2-a6bb-4002-bbdc-6da892a051a7`
- **Client ID**: `868b989e-6574-4795-bcfb-8db37bee1c37`
- **Scopes**: `openid profile email`
- **Redirect URI**: `/api/oauth2/mscallback`
- **PKCE**: Supported with `S256` code challenge method

The flow redirects the user to Microsoft's login page, then back to the basishacks callback endpoint where the authorization code is exchanged for a session.

### 3. basishacks connect

A custom OAuth2 integration that allows users to log in through the basishacks OAuth2 provider itself. This is the internal first-party application (`client_id: 97e435f4-17e8-42ef-9b12-9684fd656de9`) seeded during initialization.

See [OAuth2 System](./oauth2) for full details on the authorization code flow.

## Session Management

Sessions are handled by `nuxt-auth-utils`:

| Property | Value |
|----------|-------|
| Storage | Encrypted cookie |
| Content | `{ user: { id: number } }` |
| Max age | 30 days (`30 * 24 * 60 * 60` seconds) |
| Password | `NUXT_SESSION_PASSWORD` (>= 32 bytes) |

The session stores only the user ID. The full user record is fetched from the database on every authenticated request via `requireUser()`.

### Session type augmentation

```ts
// shared/auth.d.ts
declare module '#auth-utils' {
  interface User {
    id: number
  }
}
```

## Authorization

### Role enforcement helpers

Four helpers in `server/utils/auth.ts` enforce access control:

| Helper | Behavior |
|--------|----------|
| `requireUser(event)` | Returns the full DB user row or throws 401 |
| `requireJudge(event)` | Throws 403 if user lacks `judge` or `admin` permission |
| `requireAdmin(event)` | Throws 403 if user lacks `admin` permission |
| `requirePermission(event, permission)` | Throws 403 if user lacks the specified permission (admin always passes) |

```ts
// Example usage in an API handler
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)       // 401 if not logged in
  // ...
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)                    // 403 if not admin
  // ...
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'portal.users.view')  // 403 if not permitted
  // ...
})
```

### Fine-grained permissions

The `users.role` column stores **space-separated permission strings** rather than a single role value. This allows granular access control:

```
participant portal.users.view portal.teams.view portal.debug.view
```

The permission system is defined in `shared/permissions.ts`:

```ts
export const DevPermissions = {
  USERS: 'dev_users',
  TEAMS: 'dev_teams',
  DEBUG: 'dev_debug',
  DEEPSEEK: 'dev_deepseek',
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
} as const
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

::: warning
Permissions are URI-encoded when stored (e.g., `portal.users.view` becomes `portal.users.view` — dots are preserved). The `parsePermissions` function decodes each segment.
:::

### Admin bypass

The `admin` permission always passes all permission checks. This is enforced in both `requirePermission()` and `requireJudge()`:

```ts
export async function requirePermission(event: H3Event, permission: string) {
  const user = await requireUser(event)
  if (!hasPermission(user.role, permission) && !hasPermission(user.role, 'admin')) {
    throw createError({ status: 403, message: 'Insufficient permissions' })
  }
  return user
}
```

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

::: warning
Impersonation completely replaces the session. There is no "return to admin" mechanism — the admin must log in again.
:::

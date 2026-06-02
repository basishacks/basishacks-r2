# Authentication & Authorization

## Authentication Methods

The platform supports three authentication methods, all managed through `nuxt-auth-utils`:

### 1. Magic Code (Email)

The primary authentication method for `@basischina.com` email addresses:

1. User enters their school email
2. Server generates a 6-digit code with a 10-minute expiry
3. Code is sent via an external webhook (`NUXT_SEND_CODE_URL`)
4. User enters the 6-digit code
5. Server validates the code and establishes a session

```typescript
// Send code
POST /api/auth/code
Body: { email: "user@basischina.com", token: "<session_token>" }

// Verify code
POST /api/auth/login
Body: { email: "user@basischina.com", code: [1, 2, 3, 4, 5, 6], token: "<session_token>" }
```

**Rate limiting**: 1-minute cooldown between code requests (admins are exempt).

### 2. Microsoft OAuth2

Delegates authentication to Microsoft Entra ID:

1. User clicks "Sign in with Microsoft"
2. Server generates a PKCE challenge and redirects to Microsoft's authorization endpoint
3. Microsoft authenticates the user and redirects back with an authorization code
4. Server exchanges the code for an access token, extracts the user's email and name
5. Server finds or creates the user and establishes a session

**Configuration**: Tenant `cbc6e1e2-a6bb-4002-bbdc-6da892a051a7`, Client ID `868b989e-6574-4795-bcfb-8db37bee1c37`.

### 3. DevConnect OAuth2 (basishacks connect)

A custom OAuth2 integration that uses the platform's own OAuth2 server:

1. User is redirected to `/api/oauth2/authorize` with the DevConnect `client_id`
2. The authorization flow runs (login + consent)
3. On callback, the authorization code is exchanged for a session

This is primarily used for the `/api/login` redirect flow.

## Session Management

Sessions are handled by `nuxt-auth-utils`:

- **Session cookie** stores only `{ user: { id: number } }`
- **Session password** (`NUXT_SESSION_PASSWORD`) must be at least 32 bytes
- **Max age**: 30 days (`30 * 24 * 60 * 60` seconds)

### Session Type Augmentation

The session user type is augmented in `shared/auth.d.ts`:

```typescript
declare module '#auth-utils' {
  interface User {
    id: number
  }
}
```

### Frontend Session Access

```typescript
// Check if logged in
const { loggedIn } = useUserSession()

// Get session user ID
const { user } = useUserSession()

// Clear session (log out)
const { clear } = useUserSession()
```

## Authorization (Permissions)

### Role System

Users have a `role` field that can contain:

- **Simple roles**: `participant`, `judge`, `admin`
- **Dot-notation permissions**: `portal.users.view`, `dev_teams`, `portal.applications.create.firstparty`

Both can coexist in the same field (space-separated).

### Permission Constants

Defined in `shared/permissions.ts`:

| Constant | Value | Description |
|----------|-------|-------------|
| `USERS` | `dev_users` | Delete users |
| `TEAMS` | `dev_teams` | View/delete teams (admin) |
| `DEBUG` | `dev_debug` | Upload debug assets |
| `DEEPSEEK` | `dev_deepseek` | Manage DeepSeek sessions |
| `PORTAL_USERS_VIEW` | `portal.users.view` | View users in developer portal |
| `PORTAL_DEBUG_VIEW` | `portal.debug.view` | View debug files in portal |
| `PORTAL_TEAMS_VIEW` | `portal.teams.view` | View teams in portal |
| `PORTAL_DEEPSEEK_VIEW` | `portal.deepseek.view` | View DeepSeek in portal |
| `PORTAL_APPLICATIONS_VIEW` | `portal.applications.view` | View OAuth2 applications |
| `PORTAL_APPLICATIONS_CREATE` | `portal.applications.create` | Create OAuth2 applications |
| `PORTAL_APPLICATIONS_CREATE_FIRST_PARTY` | `portal.applications.create.firstparty` | Create first-party apps |
| `PORTAL_APPLICATIONS_DELETE` | `portal.applications.delete` | Delete OAuth2 applications |
| `PORTAL_APPLICATIONS_VIEW_ALL` | `portal.applications.view.all` | View all applications (not just own) |

### Server-Side Authorization Helpers

Defined in `server/utils/auth.ts`:

```typescript
// Require any authenticated user
const user = await requireUser(event)

// Require judge or admin role
const user = await requireJudge(event)

// Require admin role
const user = await requireAdmin(event)

// Require specific permission (admin implicitly passes)
const user = await requirePermission(event, 'portal.users.view')
```

### Permission Checking

```typescript
import { hasPermission } from '~~/shared/permissions'

// Check if user has a specific permission
hasPermission(user.role, 'admin')           // true for admin
hasPermission(user.role, 'portal.users.view') // true if permission exists in role string
```

**Important**: The `admin` role implicitly grants all permission checks. The `requirePermission` helper checks for both the specific permission AND the `admin` permission.

### Frontend Route Protection

The `auth` middleware in `app/middleware/auth.ts` redirects unauthenticated users to `/api/login`:

```typescript
// In page setup
definePageMeta({
  middleware: 'auth'
})
```

Some pages also check permissions client-side:

```typescript
if (!hasPermission(user.value.role, 'admin') && !hasPermission(user.value.role, 'judge')) {
  return navigateTo('/')
}
```

::: warning
Client-side permission checks are for UI purposes only. All authorization must be enforced server-side using the `requireUser`/`requireJudge`/`requireAdmin`/`requirePermission` helpers.
:::

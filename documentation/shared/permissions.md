# Permissions

The permission system is defined in `shared/permissions.ts` and provides fine-grained access control beyond simple roles.

## Permission Constants

```typescript
export const DevPermissions = {
  USERS: 'dev_users',
  TEAMS: 'dev_teams',
  DEBUG: 'dev_debug',
  DEEPSEEK: 'dev_deepseek',
  PORTAL_USERS_VIEW: 'portal.users.view',
  PORTAL_DEBUG_VIEW: 'portal.debug.view',
  PORTAL_TEAMS_VIEW: 'portal.teams.view',
  PORTAL_DEEPSEEK_VIEW: 'portal.deepseek.view',
  PORTAL_APPLICATIONS_VIEW: 'portal.applications.view',
  PORTAL_APPLICATIONS_CREATE: 'portal.applications.create',
  PORTAL_APPLICATIONS_CREATE_FIRST_PARTY: 'portal.applications.create.firstparty',
  PORTAL_APPLICATIONS_DELETE: 'portal.applications.delete',
  PORTAL_APPLICATIONS_VIEW_ALL: 'portal.applications.view.all',
} as const
```

## Permission Categories

### Developer Permissions (`dev_*`)

These are elevated permissions for development and administrative operations:

| Permission | Description | Used By |
|------------|-------------|---------|
| `dev_users` | Delete users | `DELETE /api/users` |
| `dev_teams` | View/delete teams (admin API) | `GET/DELETE /api/admin/teams` |
| `dev_debug` | Upload debug assets | `POST /api/debug/upload` |
| `dev_deepseek` | Create/delete DeepSeek sessions | `POST/DELETE /api/debug/deepseek/sessions/*` |

### Portal View Permissions (`portal.*.view`)

Read-only access to developer portal features:

| Permission | Description | Used By |
|------------|-------------|---------|
| `portal.users.view` | View users table | `GET /api/users`, `/developers/users` |
| `portal.debug.view` | View debug files | `GET /api/debug/files`, `/developers/debug` |
| `portal.teams.view` | View teams table | `GET /api/teams`, `/developers/teams` |
| `portal.deepseek.view` | View DeepSeek sessions | `GET /api/debug/deepseek/sessions/:id`, `/developers/deepseek` |
| `portal.applications.view` | View own OAuth2 apps | `GET /api/applications`, `/developers/applications` |
| `portal.applications.view.all` | View all OAuth2 apps | `GET /api/applications/:id` (others' apps) |

### Portal Action Permissions (`portal.*.create`, `portal.*.delete`)

Write access for specific operations:

| Permission | Description | Used By |
|------------|-------------|---------|
| `portal.applications.create` | Create OAuth2 apps | `POST /api/applications` |
| `portal.applications.create.firstparty` | Create first-party apps | `POST /api/applications` (type=first) |
| `portal.applications.delete` | Delete OAuth2 apps | `DELETE /api/applications` |

## Helper Functions

### parsePermissions

```typescript
function parsePermissions(role: string | null | undefined): string[]
```

Parses the space-separated, URI-encoded permission string from the `role` field into an array.

### hasPermission

```typescript
function hasPermission(role: string | null | undefined, permission: string): boolean
```

Checks if a user's role string contains a specific permission. Returns `false` for null/undefined roles.

### addPermission

```typescript
function addPermission(role: string | null | undefined, permission: string): string
```

Adds a permission to the role string (deduplicates). Returns the updated string.

### removePermission

```typescript
function removePermission(role: string | null | undefined, permission: string): string
```

Removes a permission from the role string. Returns the updated string.

## Storage Format

Permissions are stored in the `users.role` column as a space-separated, URI-encoded string:

```
"participant portal.users.view portal.teams.view"
```

This allows both simple roles (`participant`, `judge`, `admin`) and fine-grained permissions to coexist in the same field.

## Admin Bypass

The `admin` permission implicitly grants access to all permission checks:

```typescript
// In requirePermission()
if (!hasPermission(user.role, permission) && !hasPermission(user.role, 'admin')) {
  throw createError({ status: 403 })
}
```

This means admin users always pass permission checks regardless of which specific permission is required.

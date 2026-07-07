---
title: Permissions System
description: Fine-grained permission system replacing the old role CHECK constraint
---

# Permissions System

The basishacks platform uses a fine-grained permission system stored in the `role` column of the `users` table. This replaced the old `CHECK` constraint approach, allowing for flexible role composition.

::: info Source `shared/permissions.ts` :::

## DevPermissions Constants

The `DevPermissions` object defines all recognized permission strings:

| Constant | Permission String | Description |
| --- | --- | --- |
| `USERS` | `dev_users` | Dev: manage users |
| `TEAMS` | `dev_teams` | Dev: manage teams |
| `DEBUG` | `dev_debug` | Dev: access debug routes |
| `DEEPSEEK` | `dev_deepseek` | Dev: access DeepSeek features |
| `PORTAL_USERS_VIEW` | `portal.users.view` | Portal: view user list |
| `PORTAL_DEBUG_VIEW` | `portal.debug.view` | Portal: view debug panel |
| `PORTAL_TEAMS_VIEW` | `portal.teams.view` | Portal: view/manage teams (used for all team access) |
| `PORTAL_DEEPSEEK_VIEW` | `portal.deepseek.view` | Portal: view DeepSeek panel |
| `PORTAL_APPLICATIONS_VIEW` | `portal.applications.view` | Portal: view own applications |
| `PORTAL_APPLICATIONS_CREATE` | `portal.applications.create` | Portal: create applications |
| `PORTAL_APPLICATIONS_CREATE_FIRST_PARTY` | `portal.applications.create.firstparty` | Portal: create first-party applications |
| `PORTAL_APPLICATIONS_DELETE` | `portal.applications.delete` | Portal: delete applications |
| `PORTAL_APPLICATIONS_VIEW_ALL` | `portal.applications.view.all` | Portal: view all applications (not just own) |
| `PORTAL_SEASONS_VIEW` | `portal.seasons.view` | Portal: view seasons |
| `PORTAL_SEASONS_EDIT` | `portal.seasons.edit` | Portal: edit seasons |

**Total: 15 permissions**

## Storage Format

Permissions are stored in the `role` column of the `users` table as **space-separated URI-encoded strings**:

```
portal.users.view%20portal.teams.view%20portal.debug.view
```

When decoded, this becomes:

```
portal.users.view portal.teams.view portal.debug.view
```

This format was chosen because:

- Permission strings contain dots (`.`) which are safe in URI encoding
- Space separation allows simple `split(' ')` parsing
- URI encoding prevents ambiguity with special characters

### Why This Replaced CHECK Constraints

Previously, the `role` column used a SQL `CHECK` constraint limiting values to `'participant'`, `'judge'`, `'admin'`. This was too rigid — it could not express fine-grained permissions such as "can view debug panel but not manage users." The new system allows any combination of permissions to be assigned.

## Helper Functions

### `parsePermissions(role)`

```ts
function parsePermissions(role: string | null | undefined): string[];
```

Parses the space-separated, URI-encoded `role` string into an array of decoded permission strings. Returns an empty array for nullish input.

**Example:**

```ts
parsePermissions("portal.users.view%20portal.teams.view");
// → ['portal.users.view', 'portal.teams.view']

parsePermissions(null);
// → []
```

### `hasPermission(role, permission)`

```ts
function hasPermission(role: string | null | undefined, permission: string): boolean;
```

Checks whether the given role string includes the specified permission.

**Example:**

```ts
hasPermission("portal.users.view%20portal.teams.view", "portal.users.view");
// → true

hasPermission("portal.users.view", "portal.debug.view");
// → false
```

### `addPermission(role, permission)`

```ts
function addPermission(role: string | null | undefined, permission: string): string;
```

Adds a permission to the role string. If the permission already exists, returns the original string unchanged. Returns a URI-encoded, space-separated string suitable for storing back in the database.

**Example:**

```ts
addPermission("portal.users.view", "portal.teams.view");
// → 'portal.users.view%20portal.teams.view'

addPermission("portal.users.view%20portal.teams.view", "portal.users.view");
// → 'portal.users.view%20portal.teams.view' (no duplicate)
```

### `removePermission(role, permission)`

```ts
function removePermission(role: string | null | undefined, permission: string): string;
```

Removes a permission from the role string. Returns a URI-encoded, space-separated string.

**Example:**

```ts
removePermission("portal.users.view%20portal.teams.view", "portal.users.view");
// → 'portal.teams.view'
```

## Internal: `serializePermissions(perms)`

```ts
function serializePermissions(perms: string[]): string;
```

Private helper that maps each permission through `encodeURIComponent` and joins with spaces. Used by `addPermission` and `removePermission`.

## Usage in Server Code

Permission checks are used throughout the server to control access:

```ts
import { hasPermission, DevPermissions } from "~~/shared/permissions";

const user = await requireUser(event);

if (!hasPermission(user.role, DevPermissions.PORTAL_APPLICATIONS_VIEW_ALL)) {
    throw createError({ status: 403, message: "Insufficient permissions" });
}
```

The special `'admin'` permission string is also checked in some places as a legacy superuser override.

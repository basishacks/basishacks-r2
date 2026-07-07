---
title: OAuth2 Scopes
description: Scope definitions and management for the basishacks connect OAuth2 integration
---

# OAuth2 Scopes

The basishacks connect OAuth2 integration defines a set of scopes that third-party and first-party applications can request. Scopes control what user data and Microsoft Graph resources an application can access.

::: info Source `shared/oauth2-scopes.ts` :::

## OAuth2ScopeMeta Interface

Each scope is described by the `OAuth2ScopeMeta` interface:

```ts
export interface OAuth2ScopeMeta {
    description: string; // Human-readable description shown in consent UI
    adminOnly: boolean; // Whether only admins can assign this scope to an app
    sensitive: boolean; // Whether this scope triggers the consent page
    tooltip?: string; // Optional tooltip for the scope picker UI
}
```

## Defined Scopes

| Scope | Description | Admin Only | Sensitive | Tooltip |
| --- | --- | :-: | :-: | --- |
| `openid` | Access basic OpenID Connect identity information | No | No | — |
| `profile` | Access user profile information (name, picture, etc.) | No | No | — |
| `email` | Access user's email address | No | No | — |
| `meetings.read.application` | Reads meetings that are bound to this application | No | No | This application can only access meetings created by the application itself. Other meetings are inaccessible by this application |
| `meetings.read.all` | Reads all meetings of the user | **Yes** | **Yes** | — |
| `meetings.readwrite.application` | Reads and writes meeting applications bound to this application | No | No | — |
| `meetings.readwrite.all` | Reads and writes all meetings | **Yes** | **Yes** | — |
| `chat.read` | Read Microsoft Teams chat | No | **Yes** | This application can read chats between you and other specified users. It cannot read or receive group chats or general chat messages from everyone. |

**Total: 8 scopes** (3 admin-only or sensitive, 5 standard)

### Scope Categories

- **Identity scopes** (`openid`, `profile`, `email`) — Standard OpenID Connect scopes for user identification
- **Application-scoped Microsoft scopes** (`meetings.read.application`, `meetings.readwrite.application`) — Access limited to resources created by the application itself
- **Full-access Microsoft scopes** (`meetings.read.all`, `meetings.readwrite.all`) — Admin-only, access all user resources
- **Chat scope** (`chat.read`) — Sensitive but not admin-only; triggers consent UI

## Derived Exports

The module also exports convenience constants:

```ts
// Map of scope name → description string
export const OAuth2ScopeDescriptions: Record<string, string>;

// Array of all scope name strings
export const OAuth2ScopesList: string[];
```

These are used in validation, API responses, and the UI scope picker modal.

## Helper Functions

### `isAdminScope(scope)`

```ts
function isAdminScope(scope: string): boolean;
```

Returns `true` if the scope has `adminOnly: true` in its metadata. Returns `false` for unknown scopes.

**Example:**

```ts
isAdminScope("meetings.read.all"); // → true
isAdminScope("openid"); // → false
isAdminScope("nonexistent"); // → false
```

### `parseScopes(scopes)`

```ts
function parseScopes(scopes: string | null | undefined): string[];
```

Parses a space-separated scope string into an array. Returns an empty array for nullish input.

**Example:**

```ts
parseScopes("openid profile email");
// → ['openid', 'profile', 'email']

parseScopes(null);
// → []
```

### `hasScope(scopes, scope)`

```ts
function hasScope(scopes: string | null | undefined, scope: string): boolean;
```

Checks whether the given scope string includes the specified scope.

**Example:**

```ts
hasScope("openid profile", "profile"); // → true
hasScope("openid", "email"); // → false
```

### `addScopes(scopes, toAdd)`

```ts
function addScopes(scopes: string | null | undefined, toAdd: string[]): string;
```

Adds scopes to the existing scope string, avoiding duplicates. Returns a space-separated string.

**Example:**

```ts
addScopes("openid", ["profile", "email"]);
// → 'openid profile email'

addScopes("openid profile", ["profile"]);
// → 'openid profile' (no duplicate)
```

### `removeScope(scopes, toRemove)`

```ts
function removeScope(scopes: string | null | undefined, toRemove: string): string;
```

Removes a single scope from the scope string. Returns a space-separated string.

**Example:**

```ts
removeScope("openid profile email", "profile");
// → 'openid email'
```

## How Scopes Are Managed Per Application

Scopes are stored in the `permissions` column of the `oauth2_applications` table as a **space-separated string**:

```
openid profile email meetings.read.application
```

### Authorization Flow

1. An application requests scopes via the `scope` query parameter in the authorization URL
2. The server validates that each requested scope is in the application's `permissions` column (see `server/utils/oauth2-validate.ts`)
3. If any requested scope is not in the application's allowed permissions, the request is rejected with a 403 error
4. If any requested scope has `sensitive: true`, the user is shown a consent page before the authorization code is issued
5. The granted scopes are embedded in the JWT access token's `scope` claim

### Adding a New Scope

To add a new scope, simply add an entry to the `OAuth2Scopes` object in `shared/oauth2-scopes.ts`:

```ts
export const OAuth2Scopes: Record<string, OAuth2ScopeMeta> = {
    // ... existing scopes
    "new.scope": {
        description: "Description of the new scope",
        adminOnly: false,
        sensitive: false,
    },
};
```

The new scope automatically propagates to:

- Validation logic (via `OAuth2ScopesList`)
- API responses (via `OAuth2ScopeDescriptions`)
- The UI scope picker modal

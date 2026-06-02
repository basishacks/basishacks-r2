# Composables & Utilities

## Composables

### useApiUser

**File**: `app/composables/useApiUser.ts`

Provides the current authenticated user's full API data, along with refresh and session-clear capabilities.

```typescript
const { user, refresh, clear } = useApiUser()
```

**Returns:**
- `user: Ref<APIUser | null | undefined>` — the fetched user data from `/api/users/{id}`
- `refresh` — function to re-fetch user data
- `clear` — function to clear the session (log out)

**How it works:**
1. Gets the session user from `useUserSession()`
2. Computes the user ID from the session
3. Fetches `/api/users/{id}` using `useFetch` (only when `userID` is truthy)

## Utilities

### Constants — `app/utils/consts.ts`

```typescript
export const WEBSITE_NAME = 'basishacks'
export const THEME_NAME = 'nostalgia'
```

### Error Handling — `app/utils/errors.ts`

```typescript
export function getErrorMessage(e: unknown): string
```

Extracts a human-readable error message from a `FetchError` or unknown error. Handles the `data.message` pattern used by the API.

**Usage:**
```typescript
try {
  await $fetch('/api/teams', { method: 'POST', body: { name } })
} catch (e) {
  toast.add({ title: getErrorMessage(e), color: 'error' })
}
```

### Loading Indicator — `app/utils/loading.ts`

```typescript
export async function withLoadingIndicator<T>(func: () => T): Promise<T>
```

Wraps an async function with Nuxt's loading indicator. Starts the indicator before the function, finishes on success, and finishes with error on failure.

**Usage:**
```typescript
await withLoadingIndicator(async () => {
  await $fetch('/api/teams', { method: 'POST', body: { name } })
})
```

## Route Middleware

### auth

**File**: `app/middleware/auth.ts`

Redirects unauthenticated users to `/api/login` (which triggers the OAuth2/magic-code login flow).

**Usage:**
```typescript
definePageMeta({
  middleware: 'auth'
})
```

## App Configuration

### app.config.ts

**File**: `app/app.config.ts`

Application-level UI configuration for Nuxt UI components:

- **Container**: Custom max-widths at breakpoints (`2xl`, `xl`, `lg`) with responsive padding
- **FormField**: Label slot class override to `block bold text-default`
- **Link**: Inactive variant color set to `text-primary`

### app.vue

**File**: `app/app.vue`

The root application component:

- Wraps everything in `UApp` (provides toast/tooltip context)
- Includes `NuxtLoadingIndicator` for route transitions
- Renders `NuxtLayout` and `NuxtPage`
- Preloads `Monaspace-Neon.woff2` font

### error.vue

**File**: `app/error.vue`

Global error page:

- Displays a large SVG illustration
- Shows HTTP status code and error message
- "Go to Homepage" button
- Wrapped in `UApp` and `NuxtLayout` for consistent styling

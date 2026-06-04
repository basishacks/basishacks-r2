---
title: Composables & Utilities
description: Shared composables, middleware, constants, error handling, and cross-cutting patterns used across the basishacks frontend.
---

# Composables & Utilities

The basishacks frontend organizes shared logic into composables (`app/composables/`), route middleware (`app/middleware/`), utility functions (`app/utils/`), and app configuration (`app/app.config.ts`).

## Composables

### useApiUser

**File:** `app/composables/useApiUser.ts`

Fetches the current authenticated user from the API and returns reactive state.

```ts
export async function useApiUser() {
  const { user: sessionUser, clear } = useUserSession()
  const userID = computed(() => sessionUser.value?.id ?? 0)

  const { data, refresh } = await useFetch<GetUserResponse>(
    () => userID.value ? `/api/users/${userID.value}` : ``
  )

  return {
    user: data as Ref<APIUser | null | undefined>,
    refresh,
    clear,
  }
}
```

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `user` | `Ref<APIUser \| null \| undefined>` | Reactive user data from `/api/users/{id}` |
| `refresh` | `() => Promise<void>` | Re-fetch the user data |
| `clear` | `() => Promise<void>` | Clear the session (from `useUserSession`) |

**Usage:**

```vue
<script setup lang="ts">
const { user, refresh, clear } = await useApiUser()
</script>

<template>
  <p v-if="user">{{ user.name }}</p>
</template>
```

::: tip
This composable combines `useUserSession()` (which only stores `{ id }`) with a full user fetch, giving pages access to the complete user object including role, team, and profile data.
:::

## Route Middleware

### auth

**File:** `app/middleware/auth.ts`

Global route middleware that redirects unauthenticated users to the login endpoint.

```ts
export default defineNuxtRouteMiddleware(() => {
  const { loggedIn } = useUserSession()

  if (!loggedIn.value) {
    return navigateTo('/api/login', { external: true })
  }
})
```

**Behavior:**
- Checks `loggedIn` from `useUserSession()`
- If not logged in, redirects to `/api/login` (external navigation)
- Applied per-page via `definePageMeta({ middleware: 'auth' })` or `middleware: ['auth']`

**Pages using this middleware:** `/profile`, `/voting`, `/judging`, all `/dashboard/*` pages

## Utility Functions

### consts.ts

**File:** `app/utils/consts.ts`

Global constants used throughout the frontend.

```ts
export const WEBSITE_NAME = 'basishacks'
export const THEME_NAME = 'nostalgia'
```

| Constant | Value | Usage |
|----------|-------|-------|
| `WEBSITE_NAME` | `'basishacks'` | Displayed in headers, page titles, and welcome messages |
| `THEME_NAME` | `'nostalgia'` | Current season theme identifier |

These are auto-imported by Nuxt and available in any component or page.

### errors.ts

**File:** `app/utils/errors.ts`

Error message extraction utility for consistent error handling.

```ts
import { FetchError } from 'ofetch'

export function getErrorMessage(e: unknown) {
  try {
    if (e instanceof FetchError) {
      try {
        if (e.data && 'message' in e.data && e.data.message) {
          return String(e.data.message)
        }
      } catch {
        return e.message
      }
      return e.message
    }
    return String(e)
  } catch (inner) {
    console.error('Error trying to get error message:', inner)
    return String(e)
  }
}
```

**Behavior:**
- If the error is a `FetchError` (from `ofetch`/`$fetch`), extracts `e.data.message` first, then falls back to `e.message`
- For non-`FetchError` errors, returns `String(e)`
- Wrapped in try/catch to handle edge cases where error extraction itself fails

**Usage pattern:**

```ts
try {
  await $fetch('/api/teams', { method: 'POST', body })
} catch (e) {
  toast.add({
    color: 'error',
    title: 'Failed to create team',
    description: getErrorMessage(e),
  })
}
```

### loading.ts

**File:** `app/utils/loading.ts`

Wraps async operations with the Nuxt loading indicator.

```ts
export async function withLoadingIndicator<T>(func: () => T): Promise<T> {
  const loadingIndicator = useLoadingIndicator()
  loadingIndicator.start()
  try {
    const res = await func()
    loadingIndicator.finish()
    return res
  } catch (e) {
    loadingIndicator.finish({ error: true })
    throw e
  }
}
```

**Behavior:**
- Starts the Nuxt top-bar loading indicator before the operation
- Finishes the indicator on success
- Finishes with `error: true` on failure (shows red indicator)
- Re-throws the error so callers can handle it

**Usage pattern:**

```ts
await withLoadingIndicator(async () => {
  const res = await $fetch('/api/teams', { method: 'POST', body })
  toast.add({ color: 'success', title: res.message })
})
```

## App Configuration

### app.config.ts

**File:** `app/app.config.ts`

Customizes `@nuxt/ui` component defaults.

```ts
export default defineAppConfig({
  ui: {
    container: {
      base: "w-full 2xl:max-w-[calc(100vw-48rem)] xl:max-w-[calc(100vw-40rem)] lg:max-w-[calc(100vw-28rem)] mx-auto px-4 sm:px-6 lg:px-8"
    },
    formField: {
      slots: {
        label: 'block bold text-default',
      },
    },
    link: {
      variants: {
        active: {
          false: 'text-primary',
        },
      },
    },
  },
})
```

| Customization | Description |
|--------------|-------------|
| `container.base` | Responsive max-width that accounts for sidebar space on larger screens. Uses viewport-relative calculations: `calc(100vw - 48rem)` at 2xl, `calc(100vw - 40rem)` at xl, `calc(100vw - 28rem)` at lg. |
| `formField.slots.label` | Makes all form field labels bold with default text color |
| `link.variants.active.false` | Primary color for inactive links (overrides default muted style) |

::: tip
The container max-width calculations ensure content does not overlap with the fixed dashboard sidebar on larger screens.
:::

## Cross-Cutting Patterns

### Zod Form Validation

All forms use `@nuxt/ui`'s `UForm` component with Zod schemas from `~~/shared/schemas`:

```vue
<UForm :state="state" :schema="SubmitTeamRequest" @submit="onSubmit">
  <UFormField name="name" label="Project name">
    <UInput v-model="state.name" />
  </UFormField>
</UForm>
```

The `:schema` prop enables automatic field-level validation. Schemas are shared between client and server via `shared/schemas.ts`.

### Try/Catch with Toast

The standard error handling pattern across all pages and components:

```ts
try {
  await withLoadingIndicator(async () => {
    const res = await $fetch('/api/...', { method: 'POST', body })
    toast.add({ color: 'success', title: res.message })
  })
} catch (e) {
  toast.add({
    color: 'error',
    title: 'Operation failed',
    description: getErrorMessage(e),
  })
}
```

### Permission Gating

Role-based access control is enforced at two levels:

1. **Server-side** — `requireUser`, `requireJudge`, `requireAdmin` in `server/utils/auth.ts`
2. **Client-side** — `hasPermission()` from `~~/shared/permissions` for UI conditionals

```vue
<script setup>
import { hasPermission } from '~~/shared/permissions'

const showJudging = computed(() =>
  hasPermission(user.value?.role, 'judge') || hasPermission(user.value?.role, 'admin')
)
</script>

<template>
  <JudgingCard v-if="showJudging" />
</template>
```

::: warning
Client-side permission checks are for UI display only. All authorization is enforced server-side.
:::

### Unsaved Changes Protection

Pages with editable forms (dashboard index, dashboard general) implement a two-layer protection:

```ts
const isDirty = ref(false)

// Route navigation guard
onBeforeRouteLeave(() => {
  if (isDirty.value && !confirm('You have unsaved changes. Are you sure you want to leave?')) {
    return abortNavigation()
  }
})

// Browser close/refresh guard
function beforeUnload(event: BeforeUnloadEvent) {
  if (isDirty.value) {
    event.preventDefault()
    event.returnValue = true
  }
}

watch(isDirty, (value) => {
  if (value) {
    window.addEventListener('beforeunload', beforeUnload)
  } else {
    window.removeEventListener('beforeunload', beforeUnload)
  }
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', beforeUnload)
})
```

### Auto-Save

The `ProjectForm` component implements auto-save with a 10-second interval:

```ts
let autosaveInterval: ReturnType<typeof setInterval> | null = null

async function triggerAutosave() {
  if (!formRef.value?.dirty || !defaultTeam) return
  autosaveStatus.value = 'Auto-saving...'
  try {
    await $fetch(`/api/teams/${defaultTeam.id}`, {
      method: 'PATCH',
      body: { /* form data */ },
    })
    autosaveStatus.value = `Auto-saved at ${new Date().toLocaleTimeString()}`
  } catch (e) {
    autosaveStatus.value = 'Auto-save failed'
  }
}

onMounted(() => {
  autosaveInterval = setInterval(triggerAutosave, 10000)
})

onUnmounted(() => {
  if (autosaveInterval) clearInterval(autosaveInterval)
})
```

::: tip
Auto-save only triggers when the form is dirty. The status message is displayed below the form buttons to give users feedback.
:::

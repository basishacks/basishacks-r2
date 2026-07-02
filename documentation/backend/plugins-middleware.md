---
title: Plugins & Middleware
description: Nitro plugins and server middleware in the basishacks backend
---

# Plugins & Middleware

Nitro plugins run at server startup and can hook into the request lifecycle. Server middleware runs on every request before API handlers.

---

## Plugins

### init-database.ts

**File:** `server/plugins/init-database.ts`

Initializes the SQLite database schema and attaches the database wrapper to every request's event context.

#### Schema Creation

On first run (when no tables exist), creates the following tables:

| Table | Description |
|-------|-------------|
| `hackathon` | Single-row table controlling global event state |
| `teams` | Team records with project details, scores, and rankings |
| `team_scores` | Judge scoring records (UNIQUE per team+judge) |
| `users` | User accounts with email, role, team membership |
| `ballots` | Peer voting ballots |
| `ballot_scores` | Individual project scores within a ballot |
| `oauth2_applications` | OAuth2 client application registrations |

#### Key Schema Details

**hackathon table:**
- Single row enforced via `CHECK (id = 1)`
- Status enum: `not_started`, `in_progress`, `voting`, `finished`, `paused`
- Timestamps for start, end, voting start/end, results open
- Theme name and description

**teams table:**
- Pathway enum: `NULL`, `junior`, `senior`
- Project fields: name, description, demo_url, repo_url, submitted flag, sourcing (AI statement)
- Score and rank indexes

**users table:**
- Unique email with case-insensitive index
- Legacy `login_code` / `login_expiry` columns (unused by current Microsoft-only authentication)
- Profile theme and picture fields
- Foreign key to teams

**ballot_scores table:**
- Score enum: 1–5 (or NULL)
- UNIQUE constraint on (ballot_id, project_id)

#### Request Hook

```ts
nitroApp.hooks.hook('request', (event) => {
  event.context.drizzle = db
})
```

Every incoming request receives the same Drizzle ORM instance attached to `event.context.drizzle`. The instance is created once at server startup and shared across requests because SQLite handles concurrent readers safely and the migration/seeding work has already completed.

---

### validate-oauth2-jwt-secret.ts

**File:** `server/plugins/validate-oauth2-jwt-secret.ts`

Startup guard for `NUXT_OAUTH2_JWT_SECRET`. The secret is used by `jose` to sign and verify OAuth2 access tokens (HS256) and must be at least 32 bytes long.

#### Behavior

| Environment | Secret Missing/Too Short | Action |
|-------------|--------------------------|--------|
| `NODE_ENV=production` | Missing or `< 32 bytes` | Logs a fatal error and exits the process immediately |
| Development / Test | Missing or `< 32 bytes` | Logs a prominent warning and applies a documented dev-only fallback so local work can continue |

::: warning
The dev-only fallback (`"dev-only-placeholder-32-bytes!!"`) is **only** for local development and tests. Never use it in production.
:::

#### Implementation

```ts
export function validateOAuth2JWTSecret(options?: ValidateOAuth2JWTSecretOptions): void
```

The function reads `process.env.NUXT_OAUTH2_JWT_SECRET`, measures its UTF-8 length, and either exits (production) or writes the fallback back to the env object (development/test).

---

### microsoft.ts

**File:** `server/plugins/microsoft.ts`

Microsoft Graph API integration plugin. All Microsoft Graph API calls are centralized here for auditability.

::: warning Security Policy
All Microsoft Graph API calls MUST be made through the wrappers in this file. Never call the Graph API directly from other modules.
:::

#### Token Management

| Function | Description |
|----------|-------------|
| `initializeMSAccessToken()` | Obtains an app-level access token via client credentials flow |
| `getMSAccessToken()` | Returns the cached app-level token (lazy-initializes) |
| `initializeDummyUserAccessToken()` | Obtains a user-level token via ROPC flow for chat operations |
| `getDummyUserAccessToken()` | Returns the cached user-level token |

**App-level token:** Used for administrative operations (creating meetings, managing webhooks). Uses `client_credentials` grant type.

**User-level token:** Used for chat operations (sending messages). Uses ROPC (Resource Owner Password Credentials) grant type with the dummy user. Auto-refreshes on 401 errors.

#### Meeting Management

```ts
export async function createMicrosoftMeeting(
  target: string,
  subject: string,
  htmlDescription: string,
  startTime: string,
  endTime: string,
  attendees: any[]
): Promise<Response>
```

Creates a Microsoft Teams calendar event on behalf of a target user. Appends an auto-generated disclaimer to the event description.

#### Chat Operations

```ts
export async function createOrGetExistingDirectChat(targetId: string): Promise<{ id: string }>
```

Creates or retrieves a 1:1 chat between the dummy user and a target user. Results are cached in-memory (`directChatCache` map) to avoid repeated Graph API calls.

```ts
export async function sendChatMessage(chatId: string, content: string): Promise<Response>
export async function sendRichChatMessage(chatId: string, content: string): Promise<Response>
```

Sends a plain text or HTML message to a Microsoft Teams chat.

#### Webhook Management

```ts
export async function initializeChatbotWebhook(): Promise<void>
```

Creates a Microsoft Graph subscription for chat message notifications:
- **Change type:** `created, updated`
- **Resource:** `/chats/getAllMessages`
- **Notification URL:** `{CURRENT_URL_ORIGIN}/api/_webhooks/update`
- **Lifecycle URL:** `{CURRENT_URL_ORIGIN}/api/_webhooks/lifecycle`
- **Expiration:** 1 day (must be refreshed regularly)
- **Client state:** Random 89-byte base64url string for validation

```ts
export async function refreshChatbotWebhook(): Promise<void>
```

Extends the webhook subscription expiration by 1 day.

```ts
export function getMicrosoftWebhookState(): string | null
export function getChatbotWebhookId(): string | null
```

Returns the current webhook state and subscription ID.

#### Polling

```ts
export async function pollChatbotMessages(): Promise<void>
```

Manually polls chat messages via delta endpoint (fallback for webhook failures).

#### Internal Request Helpers

| Function | Description |
|----------|-------------|
| `requestMicrosoft(endpoint, method, body)` | Makes an authenticated request using the app-level token |
| `requestUserMicrosoft(endpoint, method, body)` | Makes an authenticated request using the user-level token (auto-refreshes on 401) |

---



## Middleware

### oauth2-authorize.ts

**File:** `server/middleware/oauth2-authorize.ts`

Validates and manages OAuth2 authorization sessions for requests to `/api/oauth2/authorize`.

#### Flow

1. **Route check** — Only processes URLs containing `/api/oauth2/authorize`
2. **Existing session check** — Reads the `bridge_id` cookie:
   - If a valid session exists with matching parameters (client_id, scope, redirect_uri, state), extends the session expiry and skips re-validation
   - If the session has an invalid login state or mismatched parameters, completes the old session and starts fresh
3. **New session validation** — Calls `validateOAuth2AuthorizationRequest` to verify all parameters
4. **Session creation** — Constructs an `AuthorizeSession`, adds it to the session store, and attaches a `bridge_id` cookie
5. **Microsoft proxy** — If the application has `proxy_microsoft` enabled, immediately redirects to Microsoft login (skips basishacks login page)

#### Error Handling

Instead of throwing HTTP errors, validation errors are encoded as base64url JSON and stored in a `bridge_error` cookie. The authorize page (`authorize.vue`) reads this cookie and displays the error in the login UI.

#### Session Cookie

The `bridge_id` cookie:
- Contains the session identifier
- Expires after 10 minutes
- `Secure` and `SameSite=Lax` flags
- Deleted after successful consent flow

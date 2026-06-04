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
- Login code with expiry for magic code auth
- Profile theme and picture fields
- Foreign key to teams

**ballot_scores table:**
- Score enum: 1–5 (or NULL)
- UNIQUE constraint on (ballot_id, project_id)

#### Request Hook

```ts
nitroApp.hooks.hook('request', (event) => {
  event.context.db = createDatabaseWrapper()
})
```

Every incoming request receives a fresh `SQLiteDatabase` wrapper attached to `event.context.db`. This ensures each request uses the same D1-compatible interface.

---

### seed-hackathon.ts

**File:** `server/plugins/seed-hackathon.ts`

Schema migration and seed data plugin. Runs after `init-database.ts`.

#### Schema Migrations

Performs `ALTER TABLE` migrations by checking for missing columns:

**Users table migrations:**
- `profile_theme` (TEXT)
- `profile_picture` (TEXT)

**Hackathon table migrations:**
- `voting_enabled`, `results_published`, `submitted_count`, `max_votes_per_user`, `judging_open` (INTEGER)
- `schedule_start`, `schedule_end` (TEXT)
- `start_timestamp`, `end_timestamp`, `voting_start_timestamp`, `voting_end_timestamp`, `results_open_timestamp` (TEXT)

#### Seed Data

**Hackathon row:**
- Upserts the hackathon row (id=1) with default timestamps
- Uses `ON CONFLICT DO UPDATE` to always refresh schedule/timestamp data

**Built-in OAuth2 application:**
```sql
INSERT OR IGNORE INTO oauth2_applications VALUES (
  '97e435f4-17e8-42ef-9b12-9684fd656de9',  -- client_id
  'local-dev-secret',                         -- client_secret
  'openid profile email',                     -- permissions
  'http://localhost:3000/api/auth',           -- redirect_uris
  'basishacks connect',                       -- name
  'BIBS-C Network internal OAuth2...',        -- description
  0,                                          -- proxy_microsoft
  'first',                                    -- type
  NULL                                        -- profile_picture
)
```

This is the first-party "basishacks connect" application used for the main site's login flow.

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

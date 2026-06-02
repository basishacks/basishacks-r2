# Plugins & Middleware

## Nitro Plugins

Plugins run in alphabetical order by filename during server startup.

### init-database.ts

**Purpose**: Initializes the SQLite database and attaches the wrapper to every request.

**Behavior**:
1. Calls `initializeDatabase()` to create the `better-sqlite3` connection
2. Checks if any tables exist; if not, executes the full schema SQL
3. Registers a `request` hook that creates a `SQLiteDatabase` wrapper and attaches it to `event.context.db`

**Schema SQL**: Contains `CREATE TABLE IF NOT EXISTS` statements for all 6 tables plus indexes.

```typescript
// Every request gets a database wrapper
nitroApp.hooks.hook('request', (event) => {
  event.context.db = createDatabaseWrapper()
})
```

### microsoft.ts

**Purpose**: Initializes Microsoft Graph API access and provides Graph API wrappers.

**Security Policy**: All Microsoft Graph API calls MUST be made through functions exported from this file.

**Initialization**:
1. Obtains an application-level access token via client credentials flow
2. Initializes a dummy user access token via ROPC flow (for Teams chat features)
3. Sets up webhook subscriptions for chat message notifications

**Exported Functions**:

| Function | Description |
|----------|-------------|
| `initializeMSAccessToken()` | Gets app-level token via client credentials |
| `getMSAccessToken()` | Returns the cached app token |
| `createMicrosoftMeeting(target, subject, html, start, end, attendees)` | Creates a calendar event |
| `initializeDummyUserAccessToken()` | Gets user token via ROPC flow |
| `getDummyUserAccessToken()` | Returns the cached user token |
| `createOrGetExistingDirectChat(targetId)` | Creates or retrieves a 1:1 chat (cached) |
| `sendChatMessage(chatId, content)` | Sends a text message in a chat |
| `sendRichChatMessage(chatId, content)` | Sends an HTML message in a chat |
| `initializeChatbotWebhook()` | Creates a webhook subscription for chat messages |
| `refreshChatbotWebhook()` | Refreshes the webhook subscription (extends expiry) |
| `getChatbotWebhookId()` | Returns the current webhook subscription ID |
| `pollChatbotMessages()` | Polls for new chat messages (delta endpoint) |

**Caching**:
- Direct chat IDs are cached in-memory (`directChatCache`) to avoid repeated Graph API calls
- Access tokens are cached in the `metadata` object
- Webhook state and ID are stored in `metadata`

**Webhook Details**:
- Subscription type: `chats/getAllMessages` (created + updated)
- Expiry: 1 day (refreshed via lifecycle notifications)
- Notification URL: `{CURRENT_URL_ORIGIN}/api/_webhooks/update`
- Lifecycle URL: `{CURRENT_URL_ORIGIN}/api/_webhooks/lifecycle`

### seed-hackathon.ts

**Purpose**: Seeds the hackathon table with default values and adds missing columns.

**Behavior**:
1. Checks for missing columns in the `users` table (`profile_theme`, `profile_picture`) and adds them with `ALTER TABLE`
2. Checks for missing columns in the `hackathon` table (all timestamp and config columns) and adds them
3. Upserts the hackathon row with default timestamps (May 2026 event dates)
4. Inserts the DevConnect OAuth2 application if it doesn't exist

**DevConnect Application**:
- Client ID: `97e435f4-17e8-42ef-9b12-9684fd656de9`
- Secret: `local-dev-secret`
- Scopes: `openid profile email`
- Redirect URI: `http://localhost:3000/api/auth`
- Type: First-party

## Server Middleware

### oauth2-authorize.ts

**Purpose**: Validates OAuth2 authorization requests before they reach the authorize page.

**Trigger**: Only runs for URLs containing `/api/oauth2/authorize`.

**Behavior**:
1. Extracts query parameters: `client_id`, `scope`, `redirect_uri`, `state`, `response_type`, `code_challenge`, `code_challenge_method`
2. Validates the request using `validateOAuth2AuthorizationRequest()`
3. If valid:
   - Creates an `AuthorizeSession`
   - Stores it in the in-memory session store
   - Attaches a `bridge_id` cookie
   - If the application has `proxy_microsoft = 1`, immediately redirects to Microsoft OAuth2
4. If invalid:
   - Sets a `bridge_error` cookie with the error message (base64url-encoded JSON)
   - Does NOT throw an error (allows the authorize page to show the error gracefully)

**Proxy Microsoft Flow**:
When an application has `proxy_microsoft` enabled, the middleware skips the basishacks login page entirely and redirects the user directly to Microsoft's OAuth2 authorization endpoint. This is useful for applications that only need Microsoft authentication.

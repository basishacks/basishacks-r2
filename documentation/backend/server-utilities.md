# Server Utilities

Server utilities are located in `server/utils/` and provide the core backend functionality.

## Database Wrapper — `database.ts`

Provides a D1-compatible SQLite wrapper for local development.

### SQLiteDatabase Class

Wraps `better-sqlite3` to mimic Cloudflare D1's interface:

```typescript
const db = event.context.db

// Prepare a statement
const stmt = db.prepare('SELECT * FROM users WHERE id = ?')

// Bind and execute
const user = stmt.bind(userId).first<User>()
const { results } = stmt.bind(userId).all<User>()
const { meta } = stmt.bind(name).run()
```

### Key Functions

| Function | Description |
|----------|-------------|
| `initializeDatabase()` | Creates the SQLite connection, enables WAL mode and foreign keys |
| `getDatabase()` | Returns the singleton database instance |
| `createDatabaseWrapper()` | Creates a new `SQLiteDatabase` wrapper instance |

### SQLiteStatement Class

| Method | Description |
|--------|-------------|
| `bind(...params)` | Binds parameters to the statement |
| `first<T>()` | Returns the first result row |
| `all<T>()` | Returns `{ results: T[] }` |
| `run()` | Executes mutation, returns `{ meta: { changed_db } }` |

## Auth Helpers — `auth.ts`

Server-side authorization helpers that enforce roles and permissions.

```typescript
// Require any authenticated user (returns full User row or 401)
const user = await requireUser(event)

// Require judge or admin (403 if not)
const user = await requireJudge(event)

// Require admin (403 if not)
const user = await requireAdmin(event)

// Require specific permission (admin implicitly passes)
const user = await requirePermission(event, 'portal.users.view')
```

All helpers:
1. Call `requireUserSession(event)` from `nuxt-auth-utils`
2. Fetch the full user from the database
3. Check permissions using `hasPermission()` from `shared/permissions.ts`

## Convert Transformers — `convert.ts`

Transforms database rows into public API objects, stripping internal fields.

### convertUserToPublic

```typescript
function convertUserToPublic(user: User): APIUser
```

Strips `login_code`, `login_expiry` and parses `profile_theme` from `"mode|value"` string to `{ mode, value }` object.

### convertTeamToPublic

```typescript
function convertTeamToPublic(team: Team, withScore: boolean = false): APITeam
```

Restructures flat team columns into a nested `project` object:
- `project_name` → `project.name`
- `project_description` → `project.description`
- `project_demo_url` → `project.demo_url`
- `project_repo_url` → `project.repo_url`
- `project_submitted` → `project.submitted` (boolean)

Score is only included when `withScore` is `true`.

## Rate Limiting — `rateLimit.ts`

In-memory rate limiter with configurable limits.

### Default Configuration

- **Max requests**: 60 per minute
- **Window**: 60,000ms (1 minute)

### Usage

```typescript
import { applyRateLimit } from '~/server/utils/rateLimit'

export default applyRateLimit(
  defineEventHandler(async (event) => {
    // handler logic
  }),
  { maxRequests: 10, windowMs: 60 * 1000 }
)
```

### Client Identification

1. **Authenticated users**: `user:{id}` (from session)
2. **Unauthenticated**: `ip:{ip}` (from `x-forwarded-for`, `cf-connecting-ip`, or `x-real-ip` headers)

### Memory Cleanup

Periodic cleanup (1% probability per request) removes entries older than 1 hour.

## Asset Management — `assets.ts`

File system operations for static and user assets.

| Function | Description |
|----------|-------------|
| `createAsset(name, data)` | Writes a file to `public/assets/` |
| `createUserAsset(name, data)` | Writes a file to `public/userast/` |
| `removeAsset(name)` | Deletes a file from `public/assets/` |
| `removeUserAsset(name)` | Deletes a file from `public/userast/` |
| `getUserAsset(name)` | Reads a file from `public/userast/` |

## Profile Pictures — `profile.ts`

Generates identicon avatars using jdenticon.

```typescript
const pngBuffer = await generateIdenticonPNG(name: string, size: number = 100)
```

Creates a PNG identicon and saves it as `users/{name}.png` in the assets directory.

## DeepSeek Store — `deepseek-store.ts`

In-memory store for DeepSeek AI chat sessions.

| Function | Description |
|----------|-------------|
| `createSession(sessionName)` | Creates a new chat session |
| `getDeepSeekSession(sessionId)` | Gets a session by ID |
| `getAllSessions()` | Returns all sessions |
| `deleteSession(sessionId)` | Deletes a session |
| `addMessage(sessionId, message)` | Adds a message to a session |
| `getMessages(sessionId)` | Gets all messages for a session |

Sessions store OpenAI `ChatCompletionMessage` arrays and support tool calling loops.

## OAuth2 Utilities

### oauth2-jwt.ts

JWT token verification and middleware for OAuth2 Bearer tokens.

| Function | Description |
|----------|-------------|
| `verifyAccessToken(token)` | Verifies a raw JWT string |
| `extractBearerToken(event)` | Extracts Bearer token from Authorization header |
| `verifyOAuth2JWT(event)` | Extracts and verifies Bearer token from request |
| `withOAuth2JWT(handler, options)` | Wraps an API handler with JWT verification |
| `requireScopes(granted, required)` | Checks for required scopes |
| `resolveOAuth2User(event, payload)` | Resolves user from JWT payload |

### oauth2-session.ts

Manages OAuth2 authorize sessions (in-memory).

| Function | Description |
|----------|-------------|
| `addAuthorizeSession(session)` | Stores a new session |
| `getAuthorizeSession(token)` | Retrieves a session (checks expiry) |
| `completeAuthorizeSession(token)` | Removes a session |
| `generateExchangeCode(session)` | Generates an authorization code |
| `exchangeAuthorizationCode(code, clientId?, redirectUri?)` | Exchanges code for JWT |
| `constructSession(...)` | Creates a new AuthorizeSession |
| `attachAuthorizeSessionCookie(session, event)` | Sets `bridge_id` cookie |

### oauth2-validate.ts

Validates OAuth2 authorization request parameters.

| Function | Description |
|----------|-------------|
| `validateOAuth2AuthorizationRequest(event, clientId, scope, redirectUri, state, responseType, codeChallenge, codeChallengeType)` | Validates client_id, scopes, redirect_uri, and returns the application |

### oauth2-login.ts

Constructs on-site login URLs for DevConnect OAuth2.

| Function | Description |
|----------|-------------|
| `constructOnSiteLoginURL()` | Generates a DevConnect OAuth2 authorization URL |

### oauth2-microsoft.ts

Generates Microsoft OAuth2 authorization links with PKCE.

| Function | Description |
|----------|-------------|
| `generateMicrosoftOAuth2Link(session)` | Generates MS OAuth2 URL with PKCE challenge |

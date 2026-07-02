---
title: Server Utilities
description: All server-side utility modules in the basishacks backend
---

# Server Utilities

All server utilities live in `server/utils/`. They provide shared functionality for API routes, plugins, and middleware.

---

## auth.ts

Authentication and authorization helpers for enforcing role-based access control.

### `requireUser`

```ts
export async function requireUser(event: H3Event): Promise<User>
```

Ensures the request is from an authenticated user. Returns the full DB user row or throws 401.

**Flow:**
1. Calls `requireUserSession(event)` from `nuxt-auth-utils` to get the session user ID
2. Fetches the user from the database via `getUser(event, userID)`
3. Throws 401 if the user is not found in the database

### `requireJudge`

```ts
export async function requireJudge(event: H3Event): Promise<User>
```

Ensures the user has judge or admin role. Throws 403 if insufficient permissions.

### `requireAdmin`

```ts
export async function requireAdmin(event: H3Event): Promise<User>
```

Ensures the user has admin role. Throws 403 if insufficient permissions.

### `requirePermission`

```ts
export async function requirePermission(event: H3Event, permission: string): Promise<User>
```

Ensures the user has a specific permission (or admin role). Uses `hasPermission` from `shared/permissions`.

**Note:** Admin role always passes all permission checks.

---

## database.ts

The database layer uses Drizzle ORM. See `server/database/` for schema definitions and initialization.

The Drizzle ORM instance is attached to `event.context.drizzle` on every request via the `init-database` Nitro plugin. All database operations go through the Drizzle query builder.

### Creating the Database Wrapper

```ts
export function createDatabaseWrapper(): DrizzleDatabase
```

Creates a new Drizzle database wrapper instance. Called per-request in the `init-database` plugin.

---

## convert.ts

Transforms internal database rows into public API response objects.

### `parseProfileTheme`

```ts
function parseProfileTheme(input?: string): ProfileTheme
```

Parses a `"mode|value"` string from the database into a `{ mode, value }` object.

- Allowed modes: `'url'`, `'emoji'`, `'gradient'`
- Falls back to `{ mode: 'emoji', value: '' }` for invalid/missing input

### `convertUserToPublic`

```ts
export function convertUserToPublic(user: User): APIUser
```

Strips internal fields from a `User` row and returns a public `APIUser`:

| Output Field | Source |
|-------------|--------|
| `id` | `user.id` |
| `email` | `user.email` |
| `role` | `user.role` |
| `name` | `user.name` |
| `team_id` | `user.team_id` |
| `profile_theme` | Parsed from `user.profile_theme` |
| `profile_picture` | `user.profile_picture` |

### `convertTeamToPublic`

```ts
export function convertTeamToPublic(team: Team, withScore?: boolean): APITeam
```

Converts a `Team` row to a public `APITeam`. The `withScore` parameter controls whether the score is included (default: `false`).

| Output Field | Source |
|-------------|--------|
| `id` | `team.id` |
| `name` | `team.name` |
| `pathway` | `team.pathway` |
| `rank` | `team.rank` |
| `score` | `team.score` (only if `withScore`) or `null` |
| `season_id` | `team.season_id` |
| `project` | Nested object from `project_name`, `project_description`, etc. |

---

## rateLimit.ts

In-memory rate limiting middleware.

### Configuration

```ts
interface RateLimitConfig {
  maxRequests: number  // Default: 60
  windowMs: number     // Default: 60000 (1 minute)
}
```

### `getClientIdentifier`

```ts
export async function getClientIdentifier(event: H3Event): Promise<string>
```

Returns a unique identifier for the client:
1. If authenticated: `user:{id}`
2. Otherwise: `ip:{x-forwarded-for | x-real-ip | 'unknown'}`

### `applyRateLimit`

```ts
export function applyRateLimit(
  handler: (event: H3Event) => Promise<any>,
  config?: Partial<RateLimitConfig>
): (event: H3Event) => Promise<any>
```

Wraps an API handler with rate limiting. Returns 429 with `Retry-After` header when exceeded.

**Features:**
- Per-identifier request tracking with sliding window
- Automatic cleanup of old entries (1% probability per request)
- Returns `Retry-After` header and reset time in error response

---

## oauth2.ts

Microsoft OAuth2 configuration and URL construction.

### Configuration

```ts
const oAuth2Config = {
  base: 'https://login.microsoftonline.com/',
  tenant: process.env.MICROSOFT_TENANT_ID || '',
  clientId: process.env.MICROSOFT_CLIENT_ID || '',
  responseType: 'code',
  redirectUri: '/api/oauth2/mscallback',
  scope: 'openid profile email',
}
```

The `tenant` and `clientId` are read from the `MICROSOFT_TENANT_ID` and `MICROSOFT_CLIENT_ID` environment variables. If either is unset, the value defaults to an empty string and Microsoft OAuth2 / Graph features are disabled gracefully.

### `structureLink`

```ts
export function structureLink(
  state: string,
  code_challenge: string,
  scope?: string,
  redirect_uri?: string
): string
```

Constructs a Microsoft OAuth2 authorization URL with PKCE parameters.

---

## oauth2-validate.ts

OAuth2 authorization request validation logic.

### `validateOAuth2AuthorizationRequest`

```ts
export async function validateOAuth2AuthorizationRequest(
  event, clientId, scope, redirectUri, state, responseType, codeChallenge, codeChallengeType
): Promise<ValidatedRequest>
```

Validates all parameters of an OAuth2 authorization request:

1. **Required parameters** — `client_id`, `scope`, `state`, `redirect_uri`
2. **PKCE detection** — If `code_challenge` is missing, falls back to OAuth2.0 protocol
3. **Scope parsing** — Decodes and splits space-separated scopes
4. **Application validation** — Verifies the client application exists
5. **Scope authorization** — Checks that requested scopes are allowed for the application
6. **Redirect URI validation** — Ensures the redirect URI is registered for the application

### `usedSensitiveScopes`

```ts
export function usedSensitiveScopes(session: AuthorizeSession): boolean
```

Returns `true` if any requested scope is marked as sensitive in `OAuth2Scopes`.

### `determinePostMicrosoft`

```ts
export function determinePostMicrosoft(event, session: AuthorizeSession): string
```

Determines the redirect URL after successful Microsoft login:
- If sensitive scopes are requested → redirect to consent page
- Otherwise → complete the flow immediately

### `completeConsentFlow`

```ts
export function completeConsentFlow(event, session: AuthorizeSession): string
```

Generates an exchange code, marks the session as completed, deletes the `bridge_id` cookie, and returns the redirect URI with `code` and `state` parameters.

---

## oauth2-jwt.ts

JWT verification and OAuth2 Bearer token handling using the `jose` library.

### `verifyAccessToken`

```ts
export async function verifyAccessToken(token: string): Promise<OAuth2JWTPayload>
```

Verifies a JWT access token against `NUXT_OAUTH2_JWT_SECRET`. Throws 401 for invalid or expired tokens.

### `extractBearerToken`

```ts
export function extractBearerToken(event: H3Event): string
```

Extracts the Bearer token from the `Authorization` header. Throws 401 if missing or malformed.

### `verifyOAuth2JWT`

```ts
export async function verifyOAuth2JWT(event: H3Event): Promise<OAuth2JWTPayload>
```

Combines `extractBearerToken` and `verifyAccessToken` into a single call.

### `parseJWScopes`

```ts
export function parseJWScopes(scope: string | undefined): string[]
```

Parses a space-separated scope string into an array.

### `requireScopes`

```ts
export function requireScopes(grantedScopes: string[], requiredScopes: string[]): void
```

Throws 403 with `insufficient_scope` if any required scope is missing.

### `resolveOAuth2User`

```ts
export async function resolveOAuth2User(event: H3Event, payload: OAuth2JWTPayload): Promise<User>
```

Resolves a user from the JWT payload's `user_id` or `sub` field. Throws 401/404 if invalid.

### `withOAuth2JWT`

```ts
export function withOAuth2JWT(
  handler: (event: H3Event) => any,
  options?: OAuth2JWTWrapperOptions
): EventHandler
```

High-level wrapper that handles the full OAuth2 JWT authentication flow:

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `requiredScopes` | `string[]` | `[]` | Scopes the token must include |
| `loadUser` | `boolean` | `false` | Fetch the DB user and attach to `event.context.oauth2.user` |

**Context attached to `event.context.oauth2`:**

| Field | Type | Description |
|-------|------|-------------|
| `payload` | `OAuth2JWTPayload` | Decoded JWT payload |
| `scopes` | `string[]` | Parsed scopes from the token |
| `user` | `User` | DB user row (only if `loadUser: true`) |

---

## profile.ts

Profile picture generation using jdenticon.

### `generateIdenticonPNG`

```ts
export async function generateIdenticonPNG(name: string, size?: number): Promise<Buffer>
```

Generates a deterministic identicon PNG from a name string and saves it as a user asset.

- Default size: 100px
- Saved to `public/assets/users/{name}.png`

---

## assets.ts

File system helpers for managing static and user assets.

### Asset Functions

| Function | Description |
|----------|-------------|
| `createAsset(name, data)` | Writes a Buffer to `public/assets/{name}` |
| `createUserAsset(name, data)` | Writes a Buffer to `public/userassets/{name}` |
| `removeAsset(name)` | Deletes a file from `public/assets/` |
| `removeUserAsset(name)` | Deletes a file from `public/userassets/` |
| `getUserAsset(name)` | Reads a file from `public/userassets/` as a Buffer |

All functions validate the asset name to prevent path traversal, create parent directories recursively, and remove functions silently catch missing-file errors. Invalid names throw a 400 error.

---

## deepseek-store.ts

In-memory store for DeepSeek AI chat sessions.

### Data Structure

```ts
interface ChatSession {
  id: number
  sessionName: string
  createdAt: number
  messages: ChatCompletionMessage[]
}
```

### Functions

| Function | Description |
|----------|-------------|
| `createSession(sessionName)` | Creates a new session with auto-incrementing ID |
| `getDeepSeekSession(sessionId)` | Returns a session by ID |
| `getAllSessions()` | Returns all sessions |
| `deleteSession(sessionId)` | Deletes a session |
| `addMessage(sessionId, message)` | Appends a message to a session |
| `getMessages(sessionId)` | Returns all messages for a session |

**Note:** All data is in-memory and lost on server restart.

---

## Database Helpers

Per-table database helper modules in `server/utils/database/`.

### users.ts

| Function | Description |
|----------|-------------|
| `getUser(event, userID)` | Get user by ID |
| `getUserByEmail(event, email)` | Get user by email (case-insensitive) |
| `addCodeToUser(event, email)` | Generate and store a 6-digit login code (10-min expiry, 1-min cooldown) |
| `getUserByCode(event, email, code)` | Verify a login code and clear it (one-time use) |
| `updateUserName(event, user)` | Update user's name |
| `updateUserProfileTheme(event, user)` | Update user's profile theme |
| `updateUserProfilePicture(event, user)` | Update user's profile picture |
| `updateUserRole(event, userID, role)` | Update user's role |
| `deleteUsers(event, userIDs)` | Delete users and their related records |

### teams.ts

| Function | Description |
|----------|-------------|
| `getTeam(event, teamID)` | Get team by ID (active season only) |
| `getAllTeams(event)` | Get all teams for active season |
| `getSubmittedUnjudgedTeams(event, judgeUserID)` | Get submitted teams not yet scored by a judge |
| `getSubmittedTeams(event)` | Get all submitted teams for active season |
| `getTeamById(event, teamID)` | Get team by ID (any season) |
| `getTeamBySeason(event, teamID, seasonId)` | Get team by ID and season |
| `getAllTeamsAllSeasons(event)` | Get all teams across all seasons |
| `getTeamsBySeason(event, seasonId)` | Get teams by season ID |
| `createTeam(event, teamName)` | Create a new team in the active season |
| `updateTeam(event, team)` | Update all team fields |
| `deleteTeams(event, teamIDs)` | Delete teams and related records |

### scores.ts

| Function | Description |
|----------|-------------|
| `createTeamScores(event, scores)` | Create a judge score record |
| `getTeamScoresByTeamID(event, teamID)` | Get all scores for a team |

### members.ts

| Function | Description |
|----------|-------------|
| `getTeamMembers(event, teamID)` | Get current team members |
| `getAllTeamMembers(event, teamID)` | Get current and past team members |
| `getUserPastTeams(event, userID)` | Get teams a user was previously in |
| `addUserPastTeam(event, userID, teamID)` | Record a past team membership |
| `removeTeamMember(event, teamID, userID)` | Remove a member (records past team first) |
| `addTeamMember(event, teamID, userID)` | Add a member to a team |

### hackathon.ts

| Function | Description |
|----------|-------------|
| `getHackathon(event)` | Get the hackathon status row (single row, id=1) |

### ballots.ts

| Function | Description |
|----------|-------------|
| `createBallot(event, userID)` | Create a ballot for a user |
| `getBallotByUser(event, userID)` | Get a user's ballot |
| `updateBallot(event, ballot)` | Update ballot reasoning/submitted status |
| `createBallotScore(event, ballotID, projectID)` | Create a ballot score entry |
| `getBallotScores(event, ballotID)` | Get all scores for a ballot |
| `getBallotScoresByTeamID(event, teamID)` | Get all ballot scores for a team |
| `updateBallotScore(event, score)` | Update a ballot score value |

### seasons.ts

| Function | Description |
|----------|-------------|
| `getSeasons(event)` | List all seasons ordered by ID |
| `getSeasonById(event, seasonId)` | Get a season by ID |
| `getActiveSeason(event)` | Get the currently active season |
| `setActiveSeason(event, seasonId)` | Set the active season (deactivates all others) |

### oauth2_applications.ts

| Function | Description |
|----------|-------------|
| `getOAuth2ApplicationCountByOwner(event, ownerId)` | Count applications owned by a user |
| `createOAuth2Application(event, ownerId, name, description, proxyMicrosoft, type)` | Create a new OAuth2 app |
| `getOAuth2Application(event, clientID)` | Get an application by client ID |
| `getAllOAuth2Applications(event)` | List all applications |
| `deleteOAuth2Applications(event, clientIDs)` | Delete applications by client ID |
| `getOAuth2ApplicationSecretAbbreviated(event, clientID)` | List abbreviated secret hashes |
| `addOAuth2ApplicationSecret(event, clientID)` | Add a new secret (SHA-256 hashed) |
| `removeOAuth2ApplicationSecret(event, clientID, abbreviated)` | Remove a secret by abbreviated hash |
| `validateOAuth2ApplicationSecret(event, clientID, plainSecret)` | Validate a secret against stored hashes |
| `getOAuth2ApplicationRedirectUris(event, clientID)` | List redirect URIs |
| `addOAuth2ApplicationRedirectUri(event, clientID, uri)` | Add a redirect URI |
| `removeOAuth2ApplicationRedirectUri(event, clientID, uri)` | Remove a redirect URI |
| `getOAuth2ApplicationScopes(event, clientID)` | List configured scopes |
| `addOAuth2ApplicationScopes(event, clientID, scopes)` | Add scopes |
| `removeOAuth2ApplicationScope(event, clientID, scope)` | Remove a scope |

**Max applications per user:** 2 (`MAX_APPLICATIONS_PER_USER`)

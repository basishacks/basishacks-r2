---
title: Server Utilities
description: All server-side utility modules in the basishacks backend
---

# Server Utilities

All server utilities live in `server/utils/`. They provide shared functionality for API routes, plugins, and middleware.

---

## auth.ts

Authentication and authorization helpers for enforcing role-based and permission-based access control. All functions are async and return the full DB user row on success.

### `requireUser`

```ts
export async function requireUser(event: H3Event): Promise<User>;
```

Ensures the request is from an authenticated user. Returns the full DB user row or throws 401.

**Flow:**

1. Calls `getUserSession(event)` from `nuxt-auth-utils` to get the session user ID.
2. Fetches the user from the database via `getUser(event, userID)`.
3. Throws 401 if the user is not found in the database.

### `requireJudge`

```ts
export async function requireJudge(event: H3Event): Promise<User>;
```

Ensures the user has the `admin` or `judge` permission. Throws 403 if permissions are insufficient. Uses `hasPermission` from `shared/permissions`.

### `requireAdmin`

```ts
export async function requireAdmin(event: H3Event): Promise<User>;
```

Ensures the user has the `admin` permission. Throws 403 if permissions are insufficient. Uses `hasPermission` from `shared/permissions`.

### `requirePermission`

```ts
export async function requirePermission(event: H3Event, permission: string): Promise<User>;
```

Ensures the user has a specific permission (or the `admin` role always passes). Uses `hasPermission` from `shared/permissions`.

**Note:** The `admin` role always passes all permission checks. Throws 403 with `"Insufficient permissions"` on failure.

---

## Database layer

The database layer uses Drizzle ORM. The canonical schema lives in `server/database/schema.ts`, and initialization/migration logic lives in `server/database/migrate.ts`. The runtime-agnostic driver selector is in `server/database/index.ts`.

### `createDrizzleDatabase`

```ts
export async function createDrizzleDatabase(dbPath?: string): Promise<DrizzleDatabase>;
```

Creates a new Drizzle ORM instance backed by `bun:sqlite` under Bun or `better-sqlite3` under Node.js. Configures WAL journal mode, enables foreign keys, runs legacy schema repair, applies pending migrations, seeds the hackathon row, and seeds the onsite-login redirect URI.

### `getDb`

```ts
export async function getDb(dbPath?: string): Promise<DrizzleDatabase>;
```

Alias for `createDrizzleDatabase`.

### Runtime attachment

The `init-database` Nitro plugin attaches the same Drizzle instance to `event.context.drizzle` on every request. All database operations go through that instance.

---

## convert.ts

Transforms internal database rows into public API response objects.

### `parseProfileTheme`

```ts
function parseProfileTheme(input?: string): ProfileTheme;
```

Parses a `"mode|value"` string from the database into a `{ mode, value }` object.

- Allowed modes: `'url'`, `'emoji'`, `'gradient'`.
- Falls back to `{ mode: 'emoji', value: '' }` for invalid or missing input.

### `convertUserToPublic`

```ts
export function convertUserToPublic(user: User): APIUser;
```

Strips internal fields from a `User` row and returns a public `APIUser`:

| Output Field      | Source                           |
| ----------------- | -------------------------------- |
| `id`              | `user.id`                        |
| `email`           | `user.email`                     |
| `role`            | `user.role`                      |
| `name`            | `user.name`                      |
| `team_id`         | `user.team_id`                   |
| `profile_theme`   | Parsed from `user.profile_theme` |
| `profile_picture` | `user.profile_picture`           |

### `convertTeamToPublic`

```ts
export function convertTeamToPublic(
    team: Team,
    withScore: boolean = false,
    awards: ResolvedAward[] = [],
): APITeam;
```

Converts a `Team` row to a public `APITeam`. The `withScore` parameter controls whether the score is included (default: `false`). Pass resolved awards to include them in the `awards` array.

| Output Field | Source                                                         |
| ------------ | -------------------------------------------------------------- |
| `id`         | `team.id`                                                      |
| `name`       | `team.name`                                                    |
| `pathway`    | `team.pathway`                                                 |
| `rank`       | `team.rank`                                                    |
| `score`      | `team.score` (only if `withScore`) or `null`                   |
| `season_id`  | `team.season_id`                                               |
| `project`    | Nested object from `project_name`, `project_description`, etc. |
| `awards`     | Resolved awards with `team_id` stripped                        |

The `project` object also includes `submitted` (boolean) and `sourcing`.

---

## rateLimit.ts

In-memory rate limiting middleware with four pre-configured tiers.

### Built-in tier configurations

| Config Constant | Default Limit | Environment Variable | Prefix | Used By |
| --- | --- | --- | --- | --- |
| `DEFAULT_RATE_LIMIT_CONFIG` | 6,000 req/min | `RATE_LIMIT_GENERAL_MAX` | (none) | General API handlers |
| `AUTH_RATE_LIMIT_CONFIG` | 600 req/min | `RATE_LIMIT_AUTH_MAX` | `auth` | `/api/login`, `/api/auth/basis/callback` |
| `VOTE_RATE_LIMIT_CONFIG` | 600 req/min | `RATE_LIMIT_VOTE_MAX` | `vote` | `/api/ballot`, `/api/teams/:id/scores` |
| `UPLOAD_RATE_LIMIT_CONFIG` | 600 req/min | `RATE_LIMIT_UPLOAD_MAX` | `upload` | `/api/debug/upload` |

### Configuration interface

```ts
interface RateLimitConfig {
    maxRequests: number; // Default: 6000 (from RATE_LIMIT_GENERAL_MAX)
    windowMs: number; // Default: 60000 (1 minute, from RATE_LIMIT_WINDOW_MS)
    keyPrefix?: string; // Optional prefix for the client identifier
    keyGenerator?: (event: H3Event) => Promise<string | null> | string | null;
}
```

### `getClientIdentifier`

```ts
export async function getClientIdentifier(event: H3Event): Promise<string>;
```

Returns a unique identifier for the client using a two-tier strategy:

1. **Authenticated requests**: `user:{id}` — extracted from the session cookie via `getUserSession(event)`.
2. **Unauthenticated requests**: `ip:{address}` — prefers the direct socket peer address (`event.node.req.socket.remoteAddress`), falling back to `x-real-ip` header, or `unknown`. When `TRUST_PROXY` is set, the rightmost untrusted hop from `x-forwarded-for` is used.

This ensures authenticated users are not rate-limited by other users' activity behind a shared NAT, while unauthenticated users are still protected at the IP level.

### `applyRateLimit`

```ts
export function applyRateLimit(
    handler: (event: H3Event) => Promise<any>,
    config?: Partial<RateLimitConfig>,
): (event: H3Event) => Promise<any>;
```

Wraps an API handler with rate limiting. Returns 429 with a `Retry-After` header when exceeded.

**Features:**

- Per-identifier request tracking with sliding window.
- Optional custom `keyGenerator` and `keyPrefix`.
- Interval-based cleanup of stale entries every 5 minutes.
- Hard cap of 10,000 tracked keys to prevent unbounded memory growth.
- `maxRequests <= 0` is treated as always-limited.

### `clearRateLimitHistory`

```ts
export function clearRateLimitHistory(): void;
```

Clears the in-memory rate limit history. Exposed primarily for tests.

---

## basis-auth.ts and oauth2.ts

`basis-auth.ts` owns OIDC discovery, confidential-client configuration, the encrypted transaction session, S256 PKCE requests, callback validation, and UserInfo loading. `oauth2.ts` now contains only the public-origin helper.

### Public origin / issuer

```ts
export function getPublicOrigin(): string;
export function getBasisAuthCallbackUrl(): string;
```

`getPublicOrigin()` normalizes `CURRENT_URL_ORIGIN`; `getBasisAuthCallbackUrl()` appends `/api/auth/basis/callback`.

---

## oauth2-jwt.ts

JWT verification and OAuth2 Bearer token handling using the `jose` library.

### `verifyAccessToken`

```ts
export async function verifyAccessToken(token: string): Promise<OAuth2JWTPayload>;
```

Verifies a basis-auth access token against its remote JWKS, requiring RS256, exact issuer and resource audience, `typ=at+jwt`, expiry, and required claims. Throws 401 for invalid or expired tokens.

### `extractBearerToken`

```ts
export function extractBearerToken(event: H3Event): string;
```

Extracts the Bearer token from the `Authorization` header. Throws 401 if missing or malformed.

### `verifyOAuth2JWT`

```ts
export async function verifyOAuth2JWT(event: H3Event): Promise<OAuth2JWTPayload>;
```

Combines `extractBearerToken` and `verifyAccessToken` into a single call.

### `parseJWScopes`

```ts
export function parseJWScopes(scope: unknown): string[];
```

Parses a space-separated scope string into an array. Returns an empty array for non-string input.

### `requireScopes`

```ts
export function requireScopes(grantedScopes: string[], requiredScopes: string[]): void;
```

Throws 403 with `insufficient_scope` if any required scope is missing.

### `resolveOAuth2User`

```ts
export async function resolveOAuth2User(event: H3Event, payload: OAuth2JWTPayload): Promise<User>;
```

Resolves a user from the JWT payload's `user_id` or `sub` field. Throws 401 if the payload has no valid user ID, or 404 if the user is not found.

### `withOAuth2JWT`

```ts
export function withOAuth2JWT(
    handler: (event: H3Event) => any,
    options?: OAuth2JWTWrapperOptions,
): EventHandler;
```

High-level wrapper that handles the full OAuth2 JWT authentication flow.

**Options:**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `requiredScopes` | `string[]` | `[]` | Scopes the token must include |
| `loadUser` | `boolean` | `false` | Fetch the DB user and attach to `event.context.oauth2.user` |

**Context attached to `event.context.oauth2`:**

| Field     | Type               | Description                            |
| --------- | ------------------ | -------------------------------------- |
| `payload` | `OAuth2JWTPayload` | Decoded JWT payload                    |
| `scopes`  | `string[]`         | Parsed scopes from the token           |
| `user`    | `User`             | DB user row (only if `loadUser: true`) |

---

## profile.ts

Profile picture generation using jdenticon.

### `generateIdenticonPNG`

```ts
export async function generateIdenticonPNG(name: string, size?: number): Promise<Buffer>;
```

Generates a deterministic identicon PNG from a name string and saves it as a user asset.

- Default size: 100px.
- The name is sanitized to filesystem-safe characters.
- Saved to `public/assets/users/{safeName}.png`.

---

## assets.ts

File system helpers for managing static and user assets with path traversal prevention.

### Path traversal protection

All asset functions implement two layers of path traversal prevention:

1. **Name sanitization** (`sanitizeAssetName`): Extracts `basename()` from the input and rejects names containing `/` or `\\`, `.`, or `..`.
2. **Resolve validation** (`resolveAssetPath`): Resolves the full path and verifies it still starts with the expected `assets/` or `userassets/` directory prefix.

```ts
function sanitizeAssetName(name: string) {
    const safeName = basename(name);
    if (!safeName || safeName === "." || safeName === "..") throw ...;
    if (safeName.includes("/") || safeName.includes("\\")) throw ...;
}

function resolveAssetPath(assetsDir: string, name: string) {
    const filePath = join(assetsDir, name);
    const prefix = assetsDir + sep;
    if (!filePath.startsWith(prefix)) throw ...;
    return filePath;
}
```

### Asset Functions

| Function                      | Description                                                     |
| ----------------------------- | --------------------------------------------------------------- |
| `createAsset(name, data)`     | Writes a Buffer to `public/assets/{name}`; returns basename     |
| `createUserAsset(name, data)` | Writes a Buffer to `public/userassets/{name}`; returns basename |
| `removeAsset(name)`           | Deletes a file from `public/assets/`                            |
| `removeUserAsset(name)`       | Deletes a file from `public/userassets/`                        |
| `getUserAsset(name)`          | Reads a file from `public/userassets/` as a Buffer              |

All functions validate the asset name to prevent path traversal, create parent directories recursively, and remove functions silently catch missing-file errors. Invalid names throw a 400 error.

---

## deepseek-store.ts

In-memory store for DeepSeek AI chat sessions.

### Data Structure

```ts
interface ChatSession {
    id: number;
    sessionName: string;
    createdAt: number;
    messages: ChatCompletionMessage[];
}
```

### Limits

- `MAX_SESSIONS` = 100
- `MAX_MESSAGES_PER_SESSION` = 200
- `SESSION_TTL_MS` = 24 hours

### Functions

| Function | Description |
| --- | --- |
| `createSession(sessionName)` | Creates a new session with auto-incrementing ID; evicts expired/oldest sessions when at capacity |
| `getDeepSeekSession(sessionId)` | Returns a session by ID |
| `getAllSessions()` | Returns all sessions |
| `deleteSession(sessionId)` | Deletes a session; returns whether a session was removed |
| `addMessage(sessionId, message)` | Appends a message to a session; trims history to the most recent 200 |
| `getMessages(sessionId)` | Returns a shallow copy of all messages for a session |

**Note:** All data is in-memory and lost on server restart.

---

## url-validation.ts

**File:** `server/utils/url-validation.ts`

Centralized helpers for validating redirect URIs and other URLs used in OAuth2 flows and external web fetches. Provides **SSRF protection** by blocking requests to internal/private networks.

### `validateExternalUrl`

```ts
export function validateExternalUrl(urlString: string): URL;
```

Parses the URL and throws if:

- Protocol is not `http:` or `https:`.
- Host is **private or loopback** (localhost, private IP ranges, etc.) — prevents SSRF attacks by ensuring external requests cannot target internal infrastructure.

### `fetchExternalHtml`

```ts
export async function fetchExternalHtml(urlString: string, init?: RequestInit): Promise<string>;
```

Fetches raw HTML from an external URL with manual redirect handling (max 5 redirects). Returns up to 15,000 characters of the response body, or an error string on failure. Each redirect target is re-validated through `validateExternalUrl` to prevent redirect-based SSRF.

### `isPrivateHost`

```ts
function isPrivateHost(host: string): boolean;
```

Returns `true` if the host is `localhost`, a loopback address, or a private IPv4/IPv6 range. Used internally by `validateExternalUrl` and can be reused for other validation contexts.

### Private IP blocklist

The function blocks the following address ranges:

| Range            | Type              |
| ---------------- | ----------------- |
| `127.0.0.0/8`    | Loopback          |
| `10.0.0.0/8`     | Private (Class A) |
| `172.16.0.0/12`  | Private (Class B) |
| `192.168.0.0/16` | Private (Class C) |
| `::1/128`        | IPv6 loopback     |
| `fc00::/7`       | IPv6 unique local |
| `localhost`      | Hostname          |

---

## scoring.ts

**File:** `server/utils/scoring.ts`

Computes weighted judge scores and rankings for a season.

### `computeScores`

```ts
export async function computeScores(event: H3Event, seasonID: number): Promise<void>;
```

Fetches all judge scores for the season, calculates a weighted average per team using the rubric defined in `shared/rubric.ts`, scales the result by 1.6, and writes the rounded score and pathway-specific rank back to each team.

---

## Database Helpers

Per-table database helper modules in `server/utils/database/`.

### users.ts

| Function | Description |
| --- | --- |
| `getUser(event, userID)` | Get user by ID |
| `getUserByEmail(event, email)` | Get user by email (case-insensitive) |
| `findOrLinkBasisAuthUser(event, identity)` | Resolve a user by issuer/subject or link the first verified login by normalized email |
| `getUserByBasisAuthSubject(event, issuer, subject)` | Resolve a linked user by stable basis-auth identity |
| `updateUserName(event, user)` | Update user's name |
| `updateUserProfileTheme(event, user)` | Update user's profile theme |
| `updateUserProfilePicture(event, user)` | Update user's profile picture |
| `updateUserRole(event, userID, role)` | Update user's role |
| `deleteUsers(event, userIDs)` | Delete users and their related records, including owned OAuth2 applications |

### teams.ts

| Function | Description |
| --- | --- |
| `getTeam(event, teamID, allSeason?)` | Get team by ID (active season by default; pass `true` for any season) |
| `getAllTeams(event)` | Get all teams for active season |
| `getSubmittedUnjudgedTeams(event, judgeUserID)` | Get submitted teams not yet scored by a judge |
| `getSubmittedTeams(event)` | Get all submitted teams for active season |
| `getTeamById(event, teamID)` | Get team by ID (any season) |
| `getTeamBySeason(event, teamID, seasonId)` | Get team by ID and season |
| `getAllTeamsAllSeasons(event)` | Get all teams across all seasons |
| `getTeamsBySeason(event, seasonId)` | Get teams by season ID |
| `createTeam(event, teamName)` | Create a new team in the active season; throws 403 if no season is active |
| `updateTeam(event, team)` | Update all team fields; throws 404 if the team does not exist |
| `deleteTeams(event, teamIDs)` | Delete teams and related records |

### scores.ts

| Function                                   | Description                 |
| ------------------------------------------ | --------------------------- |
| `createTeamScores(event, scores)`          | Create a judge score record |
| `getTeamScoresByTeamID(event, teamID)`     | Get all scores for a team   |
| `getTeamScoresBySeasonId(event, seasonID)` | Get all scores for a season |

### members.ts

| Function                                  | Description                               |
| ----------------------------------------- | ----------------------------------------- |
| `getTeamMembers(event, teamID)`           | Get current team members                  |
| `getAllTeamMembers(event, teamID)`        | Get current and past team members         |
| `getUserPastTeams(event, userID)`         | Get teams a user was previously in        |
| `addUserPastTeam(event, userID, teamID)`  | Record a past team membership             |
| `removeTeamMember(event, teamID, userID)` | Remove a member (records past team first) |
| `addTeamMember(event, teamID, userID)`    | Add a member to a team                    |

### hackathon.ts

| Function                       | Description                                                    |
| ------------------------------ | -------------------------------------------------------------- |
| `getHackathon(event)`          | Get the hackathon status row (single row, id=1)                |
| `updateHackathon(event, data)` | Update hackathon settings (partial) and return the updated row |

### ballots.ts

| Function                                        | Description                              |
| ----------------------------------------------- | ---------------------------------------- |
| `createBallot(event, userID)`                   | Create a ballot for a user               |
| `getBallotByUser(event, userID)`                | Get a user's ballot                      |
| `updateBallot(event, ballot)`                   | Update ballot reasoning/submitted status |
| `createBallotScore(event, ballotID, projectID)` | Create a ballot score entry              |
| `getBallotScores(event, ballotID)`              | Get all scores for a ballot              |
| `getBallotScoresByTeamID(event, teamID)`        | Get all ballot scores for a team         |
| `updateBallotScore(event, score)`               | Update a ballot score value              |

### seasons.ts

| Function | Description |
| --- | --- |
| `getSeasons(event)` | List all seasons ordered by ID |
| `getSeasonById(event, seasonId)` | Get a season by ID |
| `getActiveSeason(event)` | Get the currently active season |
| `setActiveSeason(event, seasonId)` | Set the active season (pass `null` to clear); copies the newly active season's tweaks into the `hackathon` row |
| `updateSeasonTweaks(event, seasonId, data)` | Update a season's tweakable settings; also updates the `hackathon` row when the season is live |
| `getScoreRankVisibilityResolver(event)` | Returns a `(seasonId) => { showScores, showRanking }` resolver that reads each season's own toggles, falling back to the `hackathon` row when the season is missing. Used by the teams and users endpoints to bind score/rank visibility to each team's own season |

`SEASON_TWEAK_FIELDS` lists the tweakable columns shared by the `seasons` and `hackathon` tables.

### peer-voting.ts

**File:** `server/utils/database/peer-voting.ts`

| Function                           | Description                                               |
| ---------------------------------- | --------------------------------------------------------- |
| `getPeerVoteByUser(event, userID)` | Get a peer voting record by user ID                       |
| `upsertPeerVote(event, vote)`      | Insert or update a peer vote (`peer_voting_scores` table) |

### awards.ts

**File:** `server/utils/database/awards.ts`

| Function                                  | Description                            |
| ----------------------------------------- | -------------------------------------- |
| `getAwards(event, teamId)`                | Get resolved awards for a single team  |
| `getAwardsForTeams(event, teamIds)`       | Get resolved awards for multiple teams |
| `createAward(event, teamId, award, meta)` | Create a team award                    |
| `deleteTeamAwards(event, teamId)`         | Delete all awards for a team           |
| `deleteAward(event, teamId, award)`       | Delete a specific award for a team     |

Award definitions live in the `awards` SQLite table.

### oauth2_applications.ts

| Function | Description |
| --- | --- |
| `getOAuth2ApplicationCountByOwner(event, ownerId)` | Count applications owned by a user |
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

**Max applications per user:** 2 (`MAX_APPLICATIONS_PER_USER`).

---
title: Server Utilities
description: All server-side utility modules in the basishacks backend
---

# Server Utilities

All server utilities live in `server/utils/`. They provide shared functionality for API routes, plugins, and middleware.

---

## auth.ts

Authentication and authorization helpers for enforcing role-based and permission-based access control.

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

Ensures the user has the `admin` or `judge` role. Throws 403 if permissions are insufficient.

### `requireAdmin`

```ts
export async function requireAdmin(event: H3Event): Promise<User>;
```

Ensures the user has the `admin` role. Throws 403 if permissions are insufficient.

### `requirePermission`

```ts
export async function requirePermission(event: H3Event, permission: string): Promise<User>;
```

Ensures the user has a specific permission (or the `admin` role). Uses `hasPermission` from `shared/permissions`.

**Note:** The `admin` role always passes all permission checks.

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

In-memory rate limiting middleware.

### Configuration

```ts
interface RateLimitConfig {
    maxRequests: number; // Default: 60
    windowMs: number; // Default: 60000 (1 minute)
    keyPrefix?: string; // Optional prefix for the client identifier
    keyGenerator?: (event: H3Event) => Promise<string | null> | string | null; // Optional custom identifier generator
}
```

### `getClientIdentifier`

```ts
export async function getClientIdentifier(event: H3Event): Promise<string>;
```

Returns a unique identifier for the client:

1. If authenticated: `user:{id}`.
2. Otherwise: `ip:{socket remote address}`, falling back to `x-real-ip` or `unknown`. When `TRUST_PROXY` is set, the rightmost untrusted hop from `x-forwarded-for` is used.

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

## oauth2.ts

Microsoft OAuth2 configuration, public origin helpers, and URL construction.

### Public origin / issuer

```ts
export function getPublicOrigin(): string;
export function getOAuth2Issuer(): string;
```

Both return `CURRENT_URL_ORIGIN` with trailing slashes stripped (default `http://localhost:3000`). `getOAuth2Issuer()` is the OIDC issuer used for JWT `iss` claims and OpenID Discovery.

### Configuration helpers

```ts
export function getMicrosoftRedirectUri(): string;
export function getOnsiteRedirectPath(): string;
export function buildOnsiteRedirectUri(origin?: string): string;
```

- `getMicrosoftRedirectUri` returns `process.env.MICROSOFT_REDIRECT_URI` or `/api/oauth2/mscallback`.
- `getOnsiteRedirectPath` returns `process.env.REDIRECT_URI` or `/api/oauth2/dccallback`.
- `buildOnsiteRedirectUri` builds a full URL using `CURRENT_URL_ORIGIN` or `http://localhost:3000`.

The Microsoft OAuth2 config object reads `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, and `MICROSOFT_REDIRECT_URI`. If the tenant or client ID is unset, Microsoft OAuth2 / Graph features are disabled gracefully. The redirect URI defaults to `/api/oauth2/mscallback`; an alias handler is also exposed at `/api/auth` for convenience.

### `structureLink`

```ts
export function structureLink(
    state: string,
    code_challenge: string,
    scope?: string,
    redirect_uri?: string,
): string;
```

Constructs a Microsoft OAuth2 authorization URL with PKCE parameters.

---

## openid-configuration.ts

Builds the OpenID Connect Discovery document served at `/.well-known/openid-configuration`.

### `buildOpenIdConfiguration`

```ts
export function buildOpenIdConfiguration(issuer?: string): OpenIdConfiguration;
```

Returns metadata matching implemented endpoints only: authorization code + PKCE, `client_secret_post`, UserInfo, scopes from `shared/oauth2-scopes.ts`. Does not include `jwks_uri`, introspection, or revocation.

---

## oauth2-validate.ts

OAuth2 authorization request validation logic.

### `validateOAuth2AuthorizationRequest`

```ts
export async function validateOAuth2AuthorizationRequest(
    event: H3Event,
    clientId: string,
    scope: string,
    redirectUri: string,
    state: string,
    responseType: string,
    codeChallenge: string,
    codeChallengeType: string,
): Promise<ValidatedRequest>;
```

Validates all parameters of an OAuth2 authorization request:

1. **Required parameters** — `client_id`, `scope`, `state`, `redirect_uri`.
2. **PKCE** — `code_challenge` and `code_challenge_method` are required; `code_challenge_method` must be `S256` or `plain`.
3. **Scope parsing** — Decodes and splits space-separated scopes.
4. **Application validation** — Verifies the client application exists.
5. **Scope authorization** — Checks that requested scopes are allowed for the application.
6. **Redirect URI validation** — Ensures the redirect URI is registered for the application.

### `usedSensitiveScopes`

```ts
export function usedSensitiveScopes(session: AuthorizeSession): boolean;
```

Returns `true` if any requested scope is marked as sensitive in `OAuth2Scopes`.

### `determinePostMicrosoft`

```ts
export function determinePostMicrosoft(event: H3Event, session: AuthorizeSession): string;
```

Determines the redirect URL after successful Microsoft login:

- If sensitive scopes are requested, redirects to the consent page.
- Otherwise, completes the flow immediately.

### `completeConsentFlow`

```ts
export function completeConsentFlow(event: H3Event, session: AuthorizeSession): string;
```

Generates an exchange code, marks the session as completed, and returns the redirect URI with `code` and `state` parameters. The `bridge_id` cookie is cleared by the caller.

---

## oauth2-token.ts

Shared authorization-code → access-token issuance.

### `redeemAuthorizationCodeForToken`

```ts
export async function redeemAuthorizationCodeForToken(
    input: RedeemAuthorizationCodeInput,
): Promise<OAuth2AccessTokenResponse>;
```

Core code exchange after the caller has authenticated the client. Used in-process by onsite `dccallback` (first-party cookie binding). Returns `{ access_token, token_type: "Bearer", expires_in: 3600 }`.

### `issueOAuth2AccessToken`

```ts
export async function issueOAuth2AccessToken(
    event: H3Event,
    input: IssueOAuth2AccessTokenInput,
): Promise<OAuth2AccessTokenResponse>;
```

Full confidential-client path used by `POST /api/oauth2/token`: validates `client_id`, `client_secret`, and optional `redirect_uri`, then redeems the code. External clients must use the HTTP endpoint; they do not import this module.

---

## oauth2-userinfo.ts

Shared OIDC UserInfo claim building.

### `buildUserInfoClaims`

```ts
export function buildUserInfoClaims(user: User, scopes: string[]): OAuth2UserInfoClaims;
```

Returns `sub` always; `name`/`picture` with `profile`; `email`/`email_verified` with `email`.

### `resolveUserInfoFromAccessToken`

```ts
export async function resolveUserInfoFromAccessToken(
    event: H3Event,
    accessToken: string,
): Promise<OAuth2UserInfoClaims>;
```

Verifies the access token, loads the user, and builds claims. Same result as `GET /api/oauth2/userinfo`. Used in-process by onsite login.

---

## oauth2-jwt.ts

JWT verification and OAuth2 Bearer token handling using the `jose` library.

### `verifyAccessToken`

```ts
export async function verifyAccessToken(token: string): Promise<OAuth2JWTPayload>;
```

Verifies a JWT access token against `NUXT_OAUTH2_JWT_SECRET`. Throws 401 for invalid or expired tokens.

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

File system helpers for managing static and user assets.

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

Centralized helpers for validating redirect URIs and other URLs used in OAuth2 flows and external web fetches.

### `validateExternalUrl`

```ts
export function validateExternalUrl(urlString: string): URL;
```

Parses the URL and throws if the protocol is not `http:` or `https:`, or if the host is private or loopback (localhost, private IP ranges, etc.).

### `fetchExternalHtml`

```ts
export async function fetchExternalHtml(urlString: string, init?: RequestInit): Promise<string>;
```

Fetches raw HTML from an external URL with manual redirect handling (max 5 redirects). Returns up to 15,000 characters of the response body, or an error string on failure.

### `isPrivateHost`

```ts
function isPrivateHost(host: string): boolean;
```

Returns `true` if the host is `localhost`, a loopback address, or a private IPv4/IPv6 range.

---

## validate-oauth2-jwt-secret.ts

**File:** `server/utils/validate-oauth2-jwt-secret.ts`

Shared guard used by the `validate-oauth2-jwt-secret.ts` Nitro plugin and tests.

```ts
export const DEV_OAUTH2_JWT_SECRET_FALLBACK: string;
```

The documented dev-only fallback (exactly 32 bytes).

```ts
export interface ValidateOAuth2JWTSecretOptions {
    env?: Record<string, string | undefined>;
    exit?: (code: number) => never;
    logError?: (...args: unknown[]) => void;
    logWarn?: (...args: unknown[]) => void;
}

export function validateOAuth2JWTSecret(options?: ValidateOAuth2JWTSecretOptions): void;
```

Validates `NUXT_OAUTH2_JWT_SECRET` length and either exits (production) or applies the fallback (development/test). The fallback is written back to the provided `env` object.

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
| `addCodeToUser(event, email)` | Create or update a user record for the given email |
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

**Max applications per user:** 2 (`MAX_APPLICATIONS_PER_USER`).

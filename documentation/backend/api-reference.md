---
title: API Reference
description: Complete reference for all API endpoints in the basishacks backend
---

# API Reference

All API routes live in `server/api/` and use Nitro's file-based routing. Input validation is performed with Zod schemas from `shared/schemas.ts`. Auth helpers from `server/utils/auth.ts` enforce role-based access.

---

## Auth

### POST `/api/auth/code`

Send a 6-digit verification code to a user's email.

| Field | Details |
|-------|---------|
| **Auth** | None |
| **Validation** | `SendCodeRequest` — `{ email: string }` (must be `@basischina.com`) |
| **Rate limit** | 1 code per minute per email (9-minute cooldown enforced in DB) |
| **Response** | `{ message: string }` |

### POST `/api/auth/login`

Verify a login code and establish a session.

| Field | Details |
|-------|---------|
| **Auth** | None |
| **Validation** | `LoginRequest` — `{ email: string, code: number[] }` (6-digit code) |
| **Response** | `{ user: APIUser }` — Sets session cookie |

### POST `/api/auth/impersonate`

Admin-only: log in as another user.

| Field | Details |
|-------|---------|
| **Auth** | Admin |
| **Validation** | `{ userId: number }` |
| **Response** | Sets session cookie for the target user |

### GET `/api/login`

Redirects to the OAuth2 authorize page for basishacks connect (the built-in first-party app).

| Field | Details |
|-------|---------|
| **Auth** | None |
| **Response** | 302 redirect to `/api/oauth2/authorize?client_id=...` |

---

## OAuth2

### POST `/api/oauth2/session`

Create a new OAuth2 authorization session.

| Field | Details |
|-------|---------|
| **Auth** | None |
| **Body** | `{ client_id, response_type, scope, state, code_challenge, code_challenge_method, redirect_uri }` |
| **Response** | `{ session_id, name, user_id, user, login_state }` |

### GET `/api/oauth2/session`

Retrieve the current OAuth2 session (identified by `bridge_id` cookie).

| Field | Details |
|-------|---------|
| **Auth** | None (uses `bridge_id` cookie) |
| **Response** | `{ session_id, name, user_id, user, login_state }` |

### DELETE `/api/oauth2/session`

Complete or cancel an OAuth2 session. Redirects to the application's redirect URI.

| Field | Details |
|-------|---------|
| **Auth** | None (uses `bridge_id` cookie) |
| **Body** | `{ action: 'consent' \| 'deny' \| 'assume_consent' }` |
| **Response** | `{ redirect_to: string }` or `{ message: string }` |

### POST `/api/oauth2/token`

Exchange an authorization code for an access token (JWT).

| Field | Details |
|-------|---------|
| **Auth** | None (requires client authentication via `client_id` + `client_secret`) |
| **Body** | `{ grant_type, code, redirect_uri, client_id, client_secret, code_verifier }` |
| **Response** | `{ access_token, token_type: 'Bearer', expires_in, scope }` |

### POST `/api/oauth2/to_microsoft`

Initiate Microsoft OAuth2 login flow.

| Field | Details |
|-------|---------|
| **Auth** | None |
| **Response** | `{ redirect_to: string }` — Microsoft login URL |

### GET `/api/oauth2/mscallback`

Microsoft OAuth2 callback. Exchanges the authorization code for a Microsoft token, creates/updates the user, and continues the OAuth2 flow.

| Field | Details |
|-------|---------|
| **Auth** | None |
| **Query** | `code`, `state`, `session_state` |
| **Response** | 302 redirect to consent page or application redirect URI |

### GET `/api/oauth2/dccallback`

basishacks connect OAuth2 callback (for the built-in first-party app). Exchanges the authorization code for a JWT and establishes the user session.

| Field | Details |
|-------|---------|
| **Auth** | None |
| **Query** | `code`, `state` |
| **Cookies** | `bridge_id` (required, binds to authorize session), `pkce_verifier` (required, PKCE code verifier set by `/api/login`) |
| **Response** | 302 redirect to `redirect` query value or `/dashboard` with session established |
| **Errors** | `400` if `bridge_id` cookie missing, authorize session not found, `state` mismatch, `pkce_verifier` cookie missing, or code exchange fails |

::: tip PKCE verifier
The `pkce_verifier` cookie is set by `constructOnSiteLoginURL` in `server/api/login.get.ts` and contains the `code_verifier` for the basishacks OAuth2 flow (client → basishacks). It is distinct from `session.ms_verifier`, which is the verifier for the Microsoft proxy flow (basishacks → Microsoft). The cookie is cleared immediately after the code exchange.
:::

### GET `/api/oauth2/userinfo`

OAuth2 UserInfo endpoint. Returns user profile data based on the Bearer token scopes.

| Field | Details |
|-------|---------|
| **Auth** | OAuth2 JWT Bearer token |
| **Required scopes** | `openid`, `profile`, and/or `email` |
| **Response** | `{ sub, name?, email?, profile_picture? }` — Fields included based on granted scopes |

---

## Users

### GET `/api/users`

List all users (admin/developer portal).

| Field | Details |
|-------|---------|
| **Auth** | User with `PORTAL_USERS_VIEW` permission or admin |
| **Response** | `User[]` (includes `past_team_ids`) |

### DELETE `/api/users`

Delete users by ID.

| Field | Details |
|-------|---------|
| **Auth** | Admin |
| **Body** | `{ ids: number[] }` |
| **Response** | `{ message: string }` |
| **Side effects** | Removes related team_scores, ballots, and past_teams records |

### GET `/api/users/:id`

Get a single user's public profile.

| Field | Details |
|-------|---------|
| **Auth** | Any authenticated user |
| **Response** | `GetUserResponse` — User with team info and past teams |

### PATCH `/api/users/:id`

Update user profile (name, avatar, profile theme).

| Field | Details |
|-------|---------|
| **Auth** | The user themselves |
| **Validation** | `UpdateUserRequest` — `{ name?, avatar?, profile_theme_image? }` |
| **Response** | `{ message: string }` |
| **File handling** | Avatar and theme images are converted from base64, stored as assets |

### GET `/api/users/:id/profile_picture`

Get a user's profile picture.

| Field | Details |
|-------|---------|
| **Auth** | None |
| **Response** | Image file (served from `/userast/` directory) |
| **Fallback** | Generates a jdenticon identicon if no custom picture exists |

---

## Teams

### GET `/api/teams`

List all teams for the active season.

| Field | Details |
|-------|---------|
| **Auth** | Any authenticated user |
| **Query** | `judging` (if `1`, returns only submitted unjudged teams for the current judge) |
| **Response** | `APITeam[]` |

### POST `/api/teams`

Create a new team.

| Field | Details |
|-------|---------|
| **Auth** | Any authenticated user (without a team) |
| **Validation** | `CreateTeamRequest` — `{ name: string }` |
| **Query** | `add` (if truthy, automatically adds the creator to the team) |
| **Response** | `CreateTeamResponse` — `{ message, team }` |

### GET `/api/teams/:id`

Get a single team's details.

| Field | Details |
|-------|---------|
| **Auth** | Any authenticated user |
| **Response** | `GetTeamResponse` — `APITeam` |

### PATCH `/api/teams/:id`

Update team details (save draft).

| Field | Details |
|-------|---------|
| **Auth** | Team member |
| **Validation** | `UpdateTeamRequest` — `{ name?, pathway?, project: { name?, description?, demo_url?, repo_url? } }` |
| **Response** | `{ message: string }` |

### POST `/api/teams/:id/submit`

Final project submission (irreversible).

| Field | Details |
|-------|---------|
| **Auth** | Team member |
| **Validation** | `SubmitTeamRequest` — Same as UpdateTeamRequest but all project fields required |
| **Response** | `{ message: string }` |
| **Side effects** | Sets `project_submitted = 1` on the team |

### POST `/api/teams/:id/scores`

Submit judge scores for a team.

| Field | Details |
|-------|---------|
| **Auth** | Judge or admin |
| **Validation** | `CreateTeamScoresRequest` — `{ scores: Record<string, 0-5>, reasoning: string }` |
| **Response** | `{ message: string }` |
| **Constraint** | One score per judge per team (UNIQUE constraint) |

### GET `/api/teams/:id/users`

List members of a team.

| Field | Details |
|-------|---------|
| **Auth** | Any authenticated user |
| **Response** | `GetTeamMembersResponse` — Array of public user objects |

### POST `/api/teams/:id/users`

Add a member to a team by email.

| Field | Details |
|-------|---------|
| **Auth** | Team member |
| **Validation** | `AddTeamMemberRequest` — `{ email: string }` |
| **Response** | `{ message: string }` |

### DELETE `/api/teams/:id/users/:user`

Remove a member from a team.

| Field | Details |
|-------|---------|
| **Auth** | Team member (can remove self or others) |
| **Response** | `{ message: string }` |
| **Side effects** | Records the team in `user_past_teams` before removing |

---

## Ballot

### GET `/api/ballot`

Get the current user's ballot for peer voting.

| Field | Details |
|-------|---------|
| **Auth** | Any authenticated user with a team |
| **Response** | `GetBallotResponse` — `{ projects, scores, reasoning }` |

### PATCH `/api/ballot`

Submit peer voting ballot.

| Field | Details |
|-------|---------|
| **Auth** | Any authenticated user with a team |
| **Validation** | `SubmitVoteRequest` — `{ scores: number[] (1-5 each, sum = 12), reasoning: string }` |
| **Response** | `{ message: string }` |

---

## Seasons

### GET `/api/seasons`

List all seasons.

| Field | Details |
|-------|---------|
| **Auth** | User with `PORTAL_SEASONS_VIEW` permission or admin |
| **Response** | `Season[]` |

### GET `/api/seasons/active`

Get the currently active season (public).

| Field | Details |
|-------|---------|
| **Auth** | None |
| **Response** | `Season` — Includes status, timestamps, theme info |

### PATCH `/api/seasons/active`

Set the active season.

| Field | Details |
|-------|---------|
| **Auth** | User with `PORTAL_SEASONS_EDIT` permission or admin |
| **Validation** | `SetActiveSeasonRequest` — `{ season_id: number | null }` |
| **Response** | `{ message: string }` |

---

## Admin

### GET `/api/admin/teams`

List all teams across all seasons (admin view).

| Field | Details |
|-------|---------|
| **Auth** | Admin |
| **Response** | Array of team objects with `season_name` field |

### DELETE `/api/admin/teams`

Delete teams by ID.

| Field | Details |
|-------|---------|
| **Auth** | Admin |
| **Body** | `{ ids: number[] }` |
| **Response** | `{ message: string }` |
| **Side effects** | Removes ballot_scores, team_scores, and unassigns users |

### GET `/api/admin/scores`

List all judge scores (admin view).

| Field | Details |
|-------|---------|
| **Auth** | Admin |
| **Response** | Array of team score records |

---

## Applications

### GET `/api/applications`

List all OAuth2 applications.

| Field | Details |
|-------|---------|
| **Auth** | User with `PORTAL_APPLICATIONS_VIEW` permission or admin |
| **Response** | `OAuth2Application[]` |

### POST `/api/applications`

Create a new OAuth2 application.

| Field | Details |
|-------|---------|
| **Auth** | User with `PORTAL_APPLICATIONS_CREATE` permission or admin |
| **Validation** | `CreateApplicationRequest` — `{ name, description?, proxy_microsoft, type }` |
| **Constraint** | Max 2 applications per user |
| **Response** | `OAuth2Application` |

### DELETE `/api/applications`

Delete OAuth2 applications by client ID.

| Field | Details |
|-------|---------|
| **Auth** | Admin |
| **Body** | `{ ids: string[] }` (client IDs) |
| **Response** | `{ message: string }` |

### GET `/api/applications/:id`

Get a single OAuth2 application.

| Field | Details |
|-------|---------|
| **Auth** | User with `PORTAL_APPLICATIONS_VIEW` permission or admin |
| **Response** | `OAuth2Application` |

### GET `/api/applications/:id/profile_picture`

Get an application's profile picture.

| Field | Details |
|-------|---------|
| **Auth** | None |
| **Response** | Image file |

### Secrets

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/applications/:id/secrets` | App owner or admin | List abbreviated secret hashes |
| POST | `/api/applications/:id/secrets` | App owner or admin | Create a new secret (returns plain text once) |
| DELETE | `/api/applications/:id/secrets` | App owner or admin | Delete a secret by abbreviated hash |

### Scopes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/applications/:id/scopes` | App owner or admin | List configured scopes |
| POST | `/api/applications/:id/scopes` | App owner or admin | Add scopes `{ scopes: string[] }` |
| DELETE | `/api/applications/:id/scopes` | App owner or admin | Remove a scope `{ scope: string }` |

### Redirect URIs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/applications/:id/redirect_uris` | App owner or admin | List redirect URIs |
| POST | `/api/applications/:id/redirect_uris` | App owner or admin | Add a redirect URI `{ uri: string }` |
| DELETE | `/api/applications/:id/redirect_uris` | App owner or admin | Remove a redirect URI `{ uri: string }` |

---

## Debug

### POST `/api/debug/upload`

Upload a file to the static assets or user assets directory.

| Field | Details |
|-------|---------|
| **Auth** | User with `PORTAL_DEBUG_VIEW` permission or admin |
| **Body** | `FormData` with `file` field |
| **Query** | `mode` (`static` or `user`), `keepName` (`true`/`false`) |
| **Response** | `{ permalink: string }` |

### GET `/api/debug/files`

List all uploaded files.

| Field | Details |
|-------|---------|
| **Auth** | User with `PORTAL_DEBUG_VIEW` permission or admin |
| **Response** | `{ assets: string[], userast: string[] }` |

### DeepSeek Sessions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/debug/deepseek/sessions` | Debug user | Create a new chat session `{ sessionName }` |
| GET | `/api/debug/deepseek/sessions/:id` | Debug user | Get session with messages |
| DELETE | `/api/debug/deepseek/sessions/:id` | Debug user | Delete a session |
| POST | `/api/debug/deepseek/sessions/:id/message` | Debug user | Send a message `{ message, role, toolId? }` |

---

## Chatbot

### GET `/api/chatbot/message`

Handle Microsoft Teams chatbot messages (webhook-driven).

| Field | Details |
|-------|---------|
| **Auth** | None (called by Microsoft Graph webhooks) |
| **Response** | Varies based on message content |

### GET `/api/chatbot/index`

Chatbot health check / info endpoint.

---

## Webhooks

### POST `/api/_webhooks/update`

Microsoft Graph webhook notification endpoint.

| Field | Details |
|-------|---------|
| **Auth** | Validated via `clientState` (webhook state) |
| **Body** | Microsoft Graph change notification payload |
| **Response** | 200 OK (acknowledgment) |

### POST `/api/_webhooks/lifecycle`

Microsoft Graph lifecycle notification endpoint (reauthorization, etc.).

| Field | Details |
|-------|---------|
| **Auth** | Microsoft Graph |
| **Body** | Lifecycle notification payload |
| **Response** | 200 OK |

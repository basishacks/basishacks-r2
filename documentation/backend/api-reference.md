---
title: API Reference
description: Complete reference for all API endpoints in the basishacks backend
---

# API Reference

All API routes live in `server/api/` and use Nitro's file-based routing.

### Security measures applied to all endpoints

Every API endpoint in the system enforces the following security measures:

| Measure | Implementation |
| --- | --- |
| **Rate limiting** | All endpoints are wrapped with `applyRateLimit()` using one of four tier configs (`DEFAULT`, `AUTH`, `VOTE`, `UPLOAD`). Returns 429 with `Retry-After` header when exceeded. |
| **Input validation** | `readValidatedBody(event, Schema.parse)` or `getValidatedQuery(event, Schema.parse)` with shared Zod schemas from `shared/schemas.ts`. |
| **Length-bounded inputs** | All string fields in Zod schemas have explicit `min()`/`max()` bounds to prevent resource exhaustion. Example: `name: z.string().min(1).max(50)`. |
| **Authentication** | `requireUser()`, `requireAdmin()`, `requirePermission()` from `server/utils/auth.ts` provide RBAC enforcement. |
| **OAuth2 JWT** | `withOAuth2JWT()` wrapper for Bearer token endpoints with scope verification. |
| **HTTP headers** | Security headers (CSP, HSTS, X-Frame-Options, etc.) applied by `security-headers.ts` middleware on every response. |

<AnimatedCounter :target="54" suffix="endpoints" />

---

## Auth

### POST `/api/auth/impersonate`

Admin-only: log in as another user.

| Field          | Details                                     |
| -------------- | ------------------------------------------- |
| **Auth**       | Admin                                       |
| **Validation** | `{ userId: number }`                        |
| **Response**   | `{ success: true }` and sets session cookie |

### GET `/api/login`

Starts basis-auth discovery and authorization code with S256 PKCE, state, nonce, and the configured resource.

| Field        | Details                                                          |
| ------------ | ---------------------------------------------------------------- |
| **Auth**     | None                                                             |
| **Query**    | `redirect` (optional safe relative post-login path)              |
| **Response** | 302 redirect to the discovered basis-auth authorization endpoint |
| **Session**  | Separate encrypted HTTP-only transaction, maximum age 10 minutes |

### GET `/api/auth/basis/callback`

Validates the stored transaction and provider response, exchanges the code using `client_secret_basic`, validates the ID token, loads UserInfo, links the verified identity, creates the local session, and discards provider tokens.

| Field | Details |
| --- | --- |
| **Auth** | None |
| **Query** | OIDC callback parameters (`code`, `state`, or provider error) |
| **Response** | 302 to the stored safe redirect or `/dashboard` |
| **Errors** | 401 for missing/expired transaction, state/nonce/PKCE failure, token/UserInfo failure, or identity conflict |

::: info Retired endpoints The native `/.well-known/openid-configuration`, `/api/oauth2/*`, and `/api/applications/*` surfaces have been removed. Register and manage clients in basis-auth. :::

---

## Users

### GET `/api/users`

List all users (mod portal).

| Field        | Details                                           |
| ------------ | ------------------------------------------------- |
| **Auth**     | User with `portal.users.view` permission or admin |
| **Response** | `APIUser[]`                                       |

### DELETE `/api/users`

Delete users by ID.

| Field | Details |
| --- | --- |
| **Auth** | User with `dev_users` permission or admin |
| **Body** | `{ ids: number[] }` |
| **Response** | `{ message: string }` |
| **Side effects** | Removes related team_scores, ballot_scores, ballots, peer_voting_scores, user_past_teams, and OAuth2 applications owned by the users |

### GET `/api/users/:id`

Get a single user's profile.

| Field | Details |
| --- | --- |
| **Auth** | Any authenticated user |
| **Response** | Self: `GetUserResponse` — full user with team and past teams; Others: `APIUser` — public profile only. For participants, each team's `score`/`rank` (current and past teams alike) are only included when the `show_scores`/`show_ranking` toggles of that team's own season are enabled; users with `portal.teams.view` or admin always see them |

### PATCH `/api/users/:id`

Update user profile (name, avatar, profile theme image).

| Field             | Details                                                             |
| ----------------- | ------------------------------------------------------------------- |
| **Auth**          | The user themselves                                                 |
| **Validation**    | `UpdateUserRequest` — `{ name?, avatar?, profile_theme_image? }`    |
| **Response**      | `{ message: string }`                                               |
| **File handling** | Avatar and theme images are converted from base64, stored as assets |

### GET `/api/users/:id/profile_picture`

Get a user's profile picture.

| Field        | Details                                                           |
| ------------ | ----------------------------------------------------------------- |
| **Auth**     | None                                                              |
| **Response** | Image file (served from `/userast/` directory)                    |
| **Fallback** | Generates a 200px jdenticon identicon if no custom picture exists |

---

## Teams

### GET `/api/teams`

List all teams for the active season, or filter by season.

| Field | Details |
| --- | --- |
| **Auth** | Any authenticated user |
| **Query** | `judging` (if `1`, returns only submitted unjudged teams for the current judge); `season_id` (optional season filter) |
| **Response** | `APITeam[]`; in the public listing, each team's `rank` is only included when the `show_ranking` toggle of that team's own season is enabled |

### POST `/api/teams`

Create a new team.

| Field          | Details                                                       |
| -------------- | ------------------------------------------------------------- |
| **Auth**       | Any authenticated user without a team                         |
| **Validation** | `CreateTeamRequest` — `{ name: string }`                      |
| **Query**      | `add` (if `true`, automatically adds the creator to the team) |
| **Constraint** | Hackathon status must be `not_started` or `in_progress`       |
| **Response**   | `APITeam`                                                     |

### GET `/api/teams/:id`

Get a single team's details.

| Field | Details |
| --- | --- |
| **Auth** | Any authenticated user |
| **Response** | `APITeam`; score is included only for team members (when the `show_scores` toggle of the team's own season is enabled) or users with the `portal.teams.view` permission/admin. `rank` is only included when the team's season `show_ranking` toggle is enabled, or for privileged users |

### PATCH `/api/teams/:id`

Update team details (save draft).

| Field | Details |
| --- | --- |
| **Auth** | Team member |
| **Validation** | `UpdateTeamRequest` — `{ name?, pathway?, project: { name?, description?, demo_url?, repo_url?, sourcing? } }` |
| **Constraint** | Hackathon status must be `not_started` or `in_progress`; project must not already be submitted |
| **Response** | `{ message: string }` |

### POST `/api/teams/:id/submit`

Final project submission (irreversible).

| Field | Details |
| --- | --- |
| **Auth** | Team member |
| **Validation** | `SubmitTeamRequest` — `{ pathway, project: { name, description, demo_url, repo_url, sourcing? } }` |
| **Constraint** | Hackathon status must be `not_started` or `in_progress`; project must not already be submitted |
| **Response** | `{ message: string }` |
| **Side effects** | Sets `project_submitted = 1` on the team |

### POST `/api/teams/:id/scores`

Submit judge scores for a team.

| Field | Details |
| --- | --- |
| **Auth** | Judge or admin |
| **Validation** | `CreateTeamScoresRequest` — `{ scores: Record<string, 0-5>, reasoning: string }` |
| **Constraint** | Hackathon status must be `voting`; one score per judge per team (UNIQUE constraint) |
| **Response** | `{ message: string }` |

### GET `/api/teams/:id/users`

List members of a team.

| Field        | Details                                                     |
| ------------ | ----------------------------------------------------------- |
| **Auth**     | Any authenticated user                                      |
| **Response** | `GetTeamMembersResponse` — `{ id, email, name, team_id }[]` |

### POST `/api/teams/:id/users`

Add a member to a team by email.

| Field | Details |
| --- | --- |
| **Auth** | Team member |
| **Validation** | `AddTeamMemberRequest` — `{ email: string }` (must be a `@basischina.com` address) |
| **Constraint** | Hackathon status must be `not_started` or `in_progress`; project must not already be submitted |
| **Response** | `{ message: string }` |

### DELETE `/api/teams/:id/users/:user`

Remove a member from a team.

| Field | Details |
| --- | --- |
| **Auth** | Team member (can remove self or others) |
| **Constraint** | Hackathon status must be `not_started` or `in_progress`; project must not already be submitted |
| **Response** | `{ message: string }` |
| **Side effects** | Records the team in `user_past_teams` before removing |

---

## Ballot

### GET `/api/ballot`

Get the current user's ballot for peer voting.

| Field           | Details                                                                    |
| --------------- | -------------------------------------------------------------------------- |
| **Auth**        | Any authenticated user with a team and a submitted project                 |
| **Constraint**  | Hackathon status must be `voting`                                          |
| **Response**    | `GetBallotResponse` — `{ submitted, projects, scores, reasoning }`         |
| **Eligibility** | Projects are filtered to the same pathway and exclude the voter's own team |

### POST `/api/ballot`

Submit peer voting ballot.

| Field | Details |
| --- | --- |
| **Auth** | Any authenticated user with a team and a submitted project |
| **Validation** | `SubmitVoteRequest` — `{ scores: number[] (0-5 each, sum = 10), reasoning: string }` |
| **Constraint** | Hackathon status must be `voting`; number of scores must match eligible projects |
| **Response** | `{ message: string }` |
| **Side effects** | Upserts a row in `peer_voting_scores` |

### GET `/api/ballot/summary`

Developer endpoint returning per-season judging progress (project, submitted, and scored counts).

| Field        | Details                                                             |
| ------------ | ------------------------------------------------------------------- |
| **Auth**     | Any authenticated user                                              |
| **Response** | `{ current: BallotSummaryItem \| null, past: BallotSummaryItem[] }` |

---

## Seasons

### GET `/api/seasons`

List all seasons.

| Field        | Details                                             |
| ------------ | --------------------------------------------------- |
| **Auth**     | User with `portal.seasons.view` permission or admin |
| **Response** | `Season[]`                                          |

### GET `/api/seasons/active`

Get the currently active season (public).

| Field | Details |
| --- | --- |
| **Auth** | None |
| **Response** | Combined season and hackathon state (including `show_scores` / `show_ranking` toggles); theme is hidden when hackathon status is `not_started` or `paused` |

### PATCH `/api/seasons/active`

Set the active season. The newly active season's tweaks are copied into the live `hackathon` row.

| Field          | Details                                                    |
| -------------- | ---------------------------------------------------------- |
| **Auth**       | User with `portal.seasons.edit` permission or admin        |
| **Validation** | `SetActiveSeasonRequest` — `{ season_id: number \| null }` |
| **Response**   | `{ message: string }`                                      |

### GET `/api/seasons/:id/tweaks`

Get the tweakable settings of a single season.

| Field        | Details                                             |
| ------------ | --------------------------------------------------- |
| **Auth**     | User with `portal.seasons.view` permission or admin |
| **Response** | `Season`                                            |

### PATCH `/api/seasons/:id/tweaks`

Update the tweakable settings of a single season. Accepts a partial body with any of: `status`, `show_scores`, `show_ranking` (booleans). Only these three settings are tweakable; any other fields in the request body are stripped.

When the season is the currently active (live) season, the `hackathon` singleton row is updated as well so changes take effect immediately.

| Field          | Details                                             |
| -------------- | --------------------------------------------------- |
| **Auth**       | User with `portal.seasons.edit` permission or admin |
| **Validation** | `UpdateSeasonTweaksRequest` (at least one field)    |
| **Response**   | `{ message: string }`                               |
| **Rate limit** | Yes                                                 |

---

## Admin

### GET `/api/admin/teams`

List all teams across all seasons (mod portal).

| Field | Details |
| --- | --- |
| **Auth** | User with `dev_teams` permission or admin |
| **Response** | Array of team objects with `season_name` and `members` (array of `{ id, name, email, profile_picture }`) |

### DELETE `/api/admin/teams`

Delete teams by ID.

| Field | Details |
| --- | --- |
| **Auth** | Admin |
| **Body** | `{ ids: number[] }` |
| **Response** | `{ message: string }` |
| **Side effects** | Removes ballot_scores, team_scores, team_awards, user_past_teams, and unassigns users |

### GET `/api/admin/scores`

List computed judge scores for all submitted teams. Use `?update=1` to persist scores and ranks to the database.

| Field        | Details                                                                 |
| ------------ | ----------------------------------------------------------------------- |
| **Auth**     | Admin                                                                   |
| **Query**    | `update` (if truthy, writes scores and ranks back to the `teams` table) |
| **Response** | `APITeam[]` with scores and ranks included                              |

### GET `/api/scores/compute`

Recalculate all judge scores and ranks for active season 1.

| Field        | Details                          |
| ------------ | -------------------------------- |
| **Auth**     | None (internal utility endpoint) |
| **Response** | `{ message: string }`            |

### GET `/api/admin/hackathon`

Read the current global hackathon configuration and all seasons.

| Field        | Details                                       |
| ------------ | --------------------------------------------- |
| **Auth**     | Admin                                         |
| **Response** | `{ hackathon: Hackathon, seasons: Season[] }` |

### PATCH `/api/admin/hackathon`

Update hackathon configuration. All fields are per-season when `season_id` is provided. When `season_id` matches the currently active season, changes are also synced to the global hackathon row so the rest of the app sees the active season's config.

| Field        | Details                                                                    |
| ------------ | -------------------------------------------------------------------------- |
| **Auth**     | Admin                                                                      |
| **Body**     | Partial `AdminUpdateHackathonRequest` (all fields optional) + `season_id?` |
| **Response** | `{ hackathon: Hackathon, seasons: Season[] }`                              |

### POST `/api/admin/seasons`

Create a new season.

| Field        | Details                                |
| ------------ | -------------------------------------- |
| **Auth**     | Admin                                  |
| **Body**     | `{ name: string, is_active?: 0 \| 1 }` |
| **Response** | `{ seasons: Season[] }`                |

### PATCH `/api/admin/seasons`

Rename, activate, or deactivate a season.

| Field        | Details                                             |
| ------------ | --------------------------------------------------- |
| **Auth**     | Admin                                               |
| **Body**     | `{ id: number, name?: string, is_active?: 0 \| 1 }` |
| **Response** | `{ seasons: Season[] }`                             |

### DELETE `/api/admin/seasons/[id]`

Delete a season by ID.

| Field        | Details                 |
| ------------ | ----------------------- |
| **Auth**     | Admin                   |
| **Params**   | `id` — positive integer |
| **Response** | `{ seasons: Season[] }` |

### GET `/api/admin/database/export`

Download a full snapshot of the database in SQLite or CSV format.

| Field | Details |
| --- | --- |
| **Auth** | Admin |
| **Query** | `format` — `sqlite` (default) or `csv` |
| **Response** | SQLite: `application/x-sqlite3` binary file. CSV: `text/csv` with per-table sections |

---

## Debug

### POST `/api/debug/upload`

Upload a file to the static assets or user assets directory.

| Field          | Details                                                            |
| -------------- | ------------------------------------------------------------------ |
| **Auth**       | Authenticated user with `dev_debug` permission or admin            |
| **Body**       | `FormData` with `file` field                                       |
| **Query**      | `mode` (`static` or `user`, required), `keepName` (`true`/`false`) |
| **Response**   | `{ permalink: string }` — `/assets/<name>` or `/userast/<name>`    |
| **Extensions** | png, jpg, jpeg, gif, webp, svg, pdf, txt, md, json, zip, mp4       |

### GET `/api/debug/files`

List all uploaded files.

| Field        | Details                                           |
| ------------ | ------------------------------------------------- |
| **Auth**     | User with `portal.debug.view` permission or admin |
| **Response** | `{ assets: string[], userast: string[] }`         |

### DeepSeek Sessions

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/debug/deepseek/sessions` | `dev_deepseek` or admin | Create a new chat session `{ sessionName }` |
| GET | `/api/debug/deepseek/sessions/:id` | `portal.deepseek.view` or admin | Get session with messages |
| DELETE | `/api/debug/deepseek/sessions/:id` | `dev_deepseek` or admin | Delete a session |
| POST | `/api/debug/deepseek/sessions/:id/message` | `dev_deepseek` or admin | Send a message `{ message, role?, toolCallId?, toolResult? }` |

---

## Chatbot

### GET `/api/chatbot/message`

Handle Microsoft Teams chatbot messages (test endpoint). Sends a test rich-text message to a hard-coded admin user.

| Field        | Details                                       |
| ------------ | --------------------------------------------- |
| **Auth**     | OAuth2 JWT Bearer with `chat.readwrite` scope |
| **Response** | `{ test: "ok" }`                              |

### GET `/api/chatbot/index`

Chatbot health check / no-op endpoint.

| Field        | Details |
| ------------ | ------- |
| **Auth**     | None    |
| **Response** | Empty   |

---

## Webhooks

### POST `/api/_webhooks/update`

Microsoft Graph webhook notification endpoint.

| Field        | Details                                                                    |
| ------------ | -------------------------------------------------------------------------- |
| **Auth**     | Validated via `clientState` (webhook state) and optional `validationToken` |
| **Body**     | Microsoft Graph change notification payload                                |
| **Response** | 200 OK (echoes `validationToken` as `text/plain` when present)             |

### POST `/api/_webhooks/lifecycle`

Microsoft Graph lifecycle notification endpoint (reauthorization, etc.).

| Field | Details |
| --- | --- |
| **Auth** | Microsoft Graph (validated via `clientState` and `validationToken`) |
| **Body** | Lifecycle notification payload |
| **Response** | 202 Accepted; refreshes the subscription when `lifecycleEvent` is `reauthorizationRequired` |

---

<TerminalWindow title="basishacks@api-test:~" prompt="$">

```bash
# Quick health check
curl -s https://localhost:24598/api/health | jq .

# List teams (authenticated)
curl -s -H "Cookie: session=..." \
  https://localhost:24598/api/teams
```

</TerminalWindow>

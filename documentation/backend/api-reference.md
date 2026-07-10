---
title: API Reference
description: Complete reference for all API endpoints in the basishacks backend
---

# API Reference

All API routes live in `server/api/` and use Nitro's file-based routing. Input validation is performed with Zod schemas from `shared/schemas.ts`. Auth helpers from `server/utils/auth.ts` enforce role-based and permission-based access.

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

Redirects to the OAuth2 authorize page for basishacks connect (the built-in first-party app).

| Field        | Details                                                           |
| ------------ | ----------------------------------------------------------------- |
| **Auth**     | None                                                              |
| **Query**    | `redirect` (optional, post-login redirect path)                   |
| **Response** | 302 redirect to `/api/oauth2/authorize?client_id=...`             |
| **Cookies**  | Sets `pkce_verifier` (10-minute, HTTP-only, Secure, SameSite=Lax) |

### GET `/api/auth`

Alias for the Microsoft OAuth2 callback handler (`/api/oauth2/mscallback`). Registered to match Azure App Registration redirect URIs that point to `/api/auth`.

| Field        | Details                                          |
| ------------ | ------------------------------------------------ |
| **Auth**     | None                                             |
| **Response** | 302 redirect after Microsoft callback processing |

---

## OAuth2

### POST `/api/oauth2/session`

Create a new OAuth2 authorization session. Rate-limited to 20 requests per minute.

| Field | Details |
| --- | --- |
| **Auth** | None |
| **Body** | `{ client_id, response_type, scope, state, redirect_uri, code_challenge, code_challenge_method, post_login_redirect? }` |
| **Response** | `{ client_id, name, description, type, session }` |
| **Cookies** | Sets `bridge_id` (10-minute, HTTP-only, Secure, SameSite=Lax) |

### GET `/api/oauth2/session`

Retrieve the current OAuth2 session (identified by the `bridge_id` cookie).

| Field        | Details                                                                       |
| ------------ | ----------------------------------------------------------------------------- |
| **Auth**     | None (uses `bridge_id` cookie)                                                |
| **Response** | `{ client_id, name, description, type, session, login_state, user_id, user }` |

### DELETE `/api/oauth2/session`

Complete or cancel an OAuth2 session. Redirects to the application's redirect URI.

| Field | Details |
| --- | --- |
| **Auth** | None (uses `bridge_id` cookie) |
| **Body** | `{ action: 'cancel' \| 'consent' \| 'deny' \| 'assume_consent' }` |
| **Response** | `{ redirect_to: string }` |
| **Actions** | `cancel`/`deny` redirect with `error=access_denied`; `consent`/`assume_consent` complete the flow |

### POST `/api/oauth2/token`

Exchange an authorization code for an access token (JWT).

| Field        | Details                                                                       |
| ------------ | ----------------------------------------------------------------------------- |
| **Auth**     | None (requires client authentication via `client_id` + `client_secret`)       |
| **Body**     | `{ grant_type, code, redirect_uri, client_id, client_secret, code_verifier }` |
| **Response** | `{ access_token, token_type: 'Bearer', expires_in: 3600 }`                    |

### POST `/api/oauth2/to_microsoft`

Initiate Microsoft OAuth2 login flow.

| Field        | Details                                         |
| ------------ | ----------------------------------------------- |
| **Auth**     | None (requires `bridge_id` cookie)              |
| **Response** | `{ redirect_to: string }` — Microsoft login URL |

### GET `/api/oauth2/mscallback`

Microsoft OAuth2 callback. Exchanges the authorization code for a Microsoft token, creates or updates the user, and continues the OAuth2 flow.

| Field        | Details                                                  |
| ------------ | -------------------------------------------------------- |
| **Auth**     | None                                                     |
| **Query**    | `code`, `state`, `session_state`                         |
| **Cookies**  | `bridge_id` (required, binds to authorize session)       |
| **Response** | 302 redirect to consent page or application redirect URI |

### GET `/api/oauth2/dccallback`

basishacks connect OAuth2 callback (for the built-in first-party app). Exchanges the authorization code for a JWT and establishes the user session.

| Field | Details |
| --- | --- |
| **Auth** | None |
| **Query** | `code`, `state`, `redirect` |
| **Cookies** | `bridge_id` (required), `pkce_verifier` (required, set by `/api/login`) |
| **Response** | 302 redirect to `redirect` query value or `/dashboard` |
| **Errors** | 400 if `bridge_id` cookie is missing, authorize session is not found, `state` mismatches, `pkce_verifier` cookie is missing, or code exchange fails |

::: tip PKCE verifier The `pkce_verifier` cookie is set by `constructOnSiteLoginURL` in `server/api/login.get.ts` and contains the `code_verifier` for the basishacks OAuth2 flow (client → basishacks). It is distinct from `session.ms_verifier`, which is the verifier for the Microsoft proxy flow (basishacks → Microsoft). The cookie is cleared immediately after the code exchange. :::

### GET `/api/oauth2/userinfo`

OAuth2 UserInfo endpoint. Returns user profile data based on the Bearer token scopes.

| Field | Details |
| --- | --- |
| **Auth** | OAuth2 JWT Bearer token |
| **Required scopes** | `openid` (always), `profile` for name/picture, `email` for email/email_verified |
| **Response** | `{ sub, name?, picture?, email?, email_verified? }` |

---

## Users

### GET `/api/users`

List all users (developer portal).

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
| **Response** | Self: `GetUserResponse` — full user with team and past teams; Others: `APIUser` — public profile only |

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
| **Response** | `APITeam[]` |

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
| **Response** | `APITeam`; score is included only for team members or users with the `portal.teams.view` permission |

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
| **Response** | Combined season and hackathon state; theme is hidden when hackathon status is `not_started` or `paused` |

### PATCH `/api/seasons/active`

Set the active season.

| Field          | Details                                                    |
| -------------- | ---------------------------------------------------------- |
| **Auth**       | User with `portal.seasons.edit` permission or admin        |
| **Validation** | `SetActiveSeasonRequest` — `{ season_id: number \| null }` |
| **Response**   | `{ message: string }`                                      |

---

## Admin

### GET `/api/admin/teams`

List all teams across all seasons (developer portal).

| Field        | Details                                        |
| ------------ | ---------------------------------------------- |
| **Auth**     | User with `dev_teams` permission or admin      |
| **Response** | Array of team objects with `season_name` field |

### DELETE `/api/admin/teams`

Delete teams by ID.

| Field | Details |
| --- | --- |
| **Auth** | User with `dev_teams` permission or admin |
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

---

## Applications

### GET `/api/applications`

List all OAuth2 applications.

| Field        | Details                                                  |
| ------------ | -------------------------------------------------------- |
| **Auth**     | User with `portal.applications.view` permission or admin |
| **Response** | `OAuth2Application[]` (excludes `client_secret`)         |

### POST `/api/applications`

Create a new OAuth2 application.

| Field | Details |
| --- | --- |
| **Auth** | User with `portal.applications.create` permission or admin |
| **Validation** | `CreateApplicationRequest` — `{ name, description?, proxy_microsoft, type? }` |
| **Constraint** | Max 2 applications per user; `type: 'first'` requires `portal.applications.create.firstparty` permission |
| **Response** | `OAuth2Application` (excludes `client_secret`) |

### DELETE `/api/applications`

Delete OAuth2 applications by client ID.

| Field        | Details                                                    |
| ------------ | ---------------------------------------------------------- |
| **Auth**     | User with `portal.applications.delete` permission or admin |
| **Body**     | `{ ids: string[] }` (client IDs)                           |
| **Response** | `{ message: string }`                                      |

### GET `/api/applications/:id`

Get a single OAuth2 application.

| Field        | Details                                                                          |
| ------------ | -------------------------------------------------------------------------------- |
| **Auth**     | Application owner, user with `portal.applications.view.all` permission, or admin |
| **Response** | `OAuth2Application` (excludes `client_secret`)                                   |

### GET `/api/applications/:id/profile_picture`

Get an application's profile picture.

| Field        | Details    |
| ------------ | ---------- |
| **Auth**     | None       |
| **Response** | Image file |

### Secrets

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/applications/:id/secrets` | Owner, `portal.applications.view.all`, or admin | List abbreviated secret hashes |
| POST | `/api/applications/:id/secrets` | Owner, `portal.applications.view.all`, or admin | Create a new secret (returns plain text once) |
| DELETE | `/api/applications/:id/secrets` | Owner, `portal.applications.view.all`, or admin | Delete a secret by abbreviated hash |

### Scopes

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/applications/:id/scopes` | Owner, `portal.applications.view.all`, or admin | List configured scopes with descriptions |
| POST | `/api/applications/:id/scopes` | Owner, `portal.applications.view.all`, or admin | Add scopes `{ scopes: string[] }` |
| DELETE | `/api/applications/:id/scopes` | Owner, `portal.applications.view.all`, or admin | Remove a scope `{ scope: string }` |

### Redirect URIs

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/applications/:id/redirect_uris` | Owner, `portal.applications.view.all`, or admin | List redirect URIs |
| POST | `/api/applications/:id/redirect_uris` | Owner, `portal.applications.view.all`, or admin | Add a redirect URI `{ uri: string }` |
| DELETE | `/api/applications/:id/redirect_uris` | Owner, `portal.applications.view.all`, or admin | Remove a redirect URI `{ uri: string }` |

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

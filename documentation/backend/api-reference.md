# API Reference

Complete reference for all 54 API endpoints in the basishacks platform.

## Authentication

### POST /api/auth/code

Sends a 6-digit login code to the user's email via an external webhook.

- **Auth**: Requires valid `bridge_id` cookie (authorize session)
- **Body**: `SendCodeRequest` — `{ email, token }`
- **Response**: `{ message: "Sent code to your Teams account" }`

### POST /api/auth/login

Verifies email + code, establishes a user session, and generates an OAuth2 exchange code.

- **Auth**: Requires valid `bridge_id` cookie
- **Body**: `LoginRequest` — `{ email, code: number[6], token }`
- **Response**: `{ user, redirect_to, time }`

### GET /api/login

Redirects to the DevConnect OAuth2 authorization URL.

- **Auth**: None
- **Response**: HTTP 302 redirect

## OAuth2

### POST /api/oauth2/session

Creates a new OAuth2 authorize session.

- **Auth**: None
- **Body**: `{ client_id, scope, redirect_uri, state, response_type, code_challenge, code_challenge_method }`
- **Response**: `{ client_id, name, description, type, session }`

### GET /api/oauth2/session

Retrieves the current authorize session details.

- **Auth**: Requires `bridge_id` cookie
- **Response**: Same as POST response

### DELETE /api/oauth2/session

Cancels the authorize session.

- **Auth**: Requires `bridge_id` cookie
- **Response**: `{ redirect_to }` (with `error=access_denied`)

### POST /api/oauth2/to_microsoft

Generates a Microsoft OAuth2 authorization link with PKCE.

- **Auth**: Requires `bridge_id` cookie
- **Response**: `{ redirect_to }`

### GET /api/oauth2/mscallback

Microsoft OAuth2 callback handler. Exchanges code, finds/creates user, generates exchange code.

- **Auth**: Requires `bridge_id` cookie + valid MS code
- **Response**: HTTP 302 redirect with `code` and `state`

### GET /api/oauth2/dccallback

DevConnect OAuth2 callback. Exchanges code for JWT and establishes session.

- **Auth**: None
- **Response**: Sets user session and redirects

### POST /api/oauth2/token

Standard OAuth2 token endpoint. Exchanges authorization code for JWT.

- **Auth**: Requires valid `client_id` and `client_secret`
- **Body**: `OAuth2TokenRequest` — `{ grant_type, code, client_id, client_secret, redirect_uri?, code_verifier? }`
- **Response**: `{ access_token, token_type: "Bearer", expires_in: 3600 }`

### GET /api/oauth2/userinfo

Returns user claims based on granted scopes.

- **Auth**: Bearer JWT (via `withOAuth2JWT`)
- **Response**: `{ sub, name?, picture?, email?, email_verified? }` (scope-dependent)

## Users

### GET /api/users

Returns all users ordered by ID.

- **Auth**: `portal.users.view` permission
- **Response**: `User[]`

### DELETE /api/users

Deletes users by IDs.

- **Auth**: `dev_users` permission
- **Rate limit**: 60/min
- **Body**: `{ ids: number[] }`
- **Response**: `{ message }`

### GET /api/users/:id

Returns a user's public profile with optional team info.

- **Auth**: None (public; team info shown only to the user themselves)
- **Response**: `GetUserResponse`

### PATCH /api/users/:id

Updates the authenticated user's profile (name, avatar, theme image).

- **Auth**: Session (own profile only)
- **Rate limit**: 10/min
- **Body**: `UpdateUserRequest` — `{ name?, profile_theme_image?, avatar? }`
- **Response**: `{ message }`

### GET /api/users/:id/profile_picture

Returns the user's profile picture as PNG. Generates jdenticon if no custom picture.

- **Auth**: None (public)
- **Response**: PNG image stream

## Teams

### GET /api/teams

Returns all teams, or only submitted/unjudged teams for a judge.

- **Auth**: `portal.teams.view` (or judge role for `?judging`)
- **Query**: `?judging` — filter for judge scoring
- **Response**: `APITeam[]`

### POST /api/teams

Creates a new team. Optionally auto-joins the creator.

- **Auth**: Session
- **Body**: `CreateTeamRequest` — `{ name }`
- **Query**: `?add=true` — auto-join creator
- **Response**: `APITeam`

### PATCH /api/teams/:id

Updates team name, pathway, and project details.

- **Auth**: Session (team member only)
- **Body**: `UpdateTeamRequest` — `{ name?, pathway?, project? }`
- **Response**: `{ message }`

### POST /api/teams/:id/submit

Submits the team's project for judging.

- **Auth**: Session (team member only)
- **Body**: `SubmitTeamRequest` — `{ pathway, project: { name, description, demo_url, repo_url } }`
- **Response**: `{ message }`

### GET /api/teams/:id/users

Returns all members of a team.

- **Auth**: None (public)
- **Response**: `GetTeamMembersResponse`

### POST /api/teams/:id/users

Adds a user to the team by email.

- **Auth**: Session (team member only)
- **Body**: `AddTeamMemberRequest` — `{ email }`
- **Response**: `{ message }`

### DELETE /api/teams/:id/users/:user

Removes a user from the team.

- **Auth**: Session (team member only)
- **Response**: `{ message }`

### POST /api/teams/:id/scores

Submits judge scores for a team.

- **Auth**: Judge role
- **Body**: `CreateTeamScoresRequest` — `{ reasoning, scores }`
- **Response**: `{ message }`

## Ballot (Peer Voting)

### GET /api/ballot

Gets or creates the current user's voting ballot with 4 random projects.

- **Auth**: Session (participant with submitted project)
- **Response**: `GetBallotResponse`

### PATCH /api/ballot

Submits the peer vote. Scores must sum to 12.

- **Auth**: Session (with existing ballot)
- **Body**: `SubmitVoteRequest` — `{ scores: number[], reasoning }`
- **Response**: `{ message }`

## Hackathon

### GET /api/hackathon

Returns current hackathon status and timing. Theme hidden before event start.

- **Auth**: None (public)
- **Response**: `{ status, start_timestamp, end_timestamp, voting_start_timestamp, voting_end_timestamp, results_open_timestamp, theme_name, theme_description }`

## Admin

### GET /api/admin/scores

Calculates and returns team scores/rankings. 25% peer + 75% judge.

- **Auth**: Admin role
- **Query**: `?update=true` — persist to database
- **Response**: `APITeam[]` with `rank` and `score`

### GET /api/admin/teams

Returns all teams (raw DB rows).

- **Auth**: `dev_teams` permission
- **Response**: `Team[]`

### DELETE /api/admin/teams

Deletes teams by IDs.

- **Auth**: `dev_teams` permission
- **Rate limit**: 60/min
- **Body**: `{ ids: number[] }`
- **Response**: `{ message }`

## Applications (OAuth2)

### GET /api/applications

Returns all OAuth2 applications (excluding secrets).

- **Auth**: `portal.applications.view` permission
- **Response**: `Omit<OAuth2Application, 'client_secret'>[]`

### POST /api/applications

Creates a new OAuth2 application (max 2 per user).

- **Auth**: `portal.applications.create` permission
- **Body**: `CreateApplicationRequest` — `{ name, description?, proxy_microsoft, type? }`
- **Response**: `OAuth2Application`

### DELETE /api/applications

Deletes OAuth2 applications by client IDs.

- **Body**: `{ ids: string[] }`
- **Response**: `{ message }`

### GET /api/applications/:id

Returns application details (owner or admin only).

- **Auth**: Session (owner or `portal.applications.view.all`)
- **Response**: `Omit<OAuth2Application, 'client_secret'>`

### GET /api/applications/:id/profile_picture

Returns application icon as PNG (jdenticon fallback).

- **Auth**: None (public)
- **Response**: PNG image stream

### GET /api/applications/:id/secrets

Returns abbreviated client secrets.

- **Auth**: Session (owner or admin)
- **Response**: `{ abbreviated: string }[]`

### POST /api/applications/:id/secrets

Generates a new client secret (plain text shown once).

- **Auth**: Session (owner or admin)
- **Response**: `{ plain_secret }`

### DELETE /api/applications/:id/secrets

Deletes a client secret by abbreviated form.

- **Auth**: Session (owner or admin)
- **Body**: `{ abbreviated }`
- **Response**: `{ message }`

### GET /api/applications/:id/scopes

Returns application scopes with descriptions.

- **Auth**: Session (owner or admin)
- **Response**: `{ scope, description, adminOnly }[]`

### POST /api/applications/:id/scopes

Adds scopes to an application.

- **Auth**: Session (owner or admin; admin required for admin-only scopes)
- **Body**: `{ scopes: string[] }`
- **Response**: `{ message }`

### DELETE /api/applications/:id/scopes

Removes a scope from an application.

- **Auth**: Session (owner or admin)
- **Body**: `{ scope }`
- **Response**: `{ message }`

### GET /api/applications/:id/redirect_uris

Returns registered redirect URIs.

- **Auth**: Session (owner or admin)
- **Response**: `{ uri: string }[]`

### POST /api/applications/:id/redirect_uris

Adds a redirect URI (must start with `https://` or `http://localhost`).

- **Auth**: Session (owner or admin)
- **Body**: `ManageRedirectUriRequest` — `{ uri }`
- **Response**: `{ message }`

### DELETE /api/applications/:id/redirect_uris

Removes a redirect URI.

- **Auth**: Session (owner or admin)
- **Body**: `{ uri }`
- **Response**: `{ message }`

## Chatbot

### GET /api/chatbot

Placeholder endpoint (no-op).

### GET /api/chatbot/message

Test endpoint that creates a Teams chat and sends a message.

- **Auth**: Bearer JWT (`withOAuth2JWT`, `loadUser: true`)
- **Response**: `{ test: "ok" }`

## Webhooks

### POST /api/_webhooks/update

Microsoft Graph webhook notification endpoint.

- **Auth**: Validates `clientState` against stored webhook state
- **Response**: `validationToken` as text/plain (for validation), or `{ message: "Received" }`

### POST /api/_webhooks/lifecycle

Microsoft Graph webhook lifecycle endpoint. Handles subscription reauthorization.

- **Auth**: Validates `clientState`
- **Response**: `validationToken` as text/plain, or HTTP 202

## Debug

### GET /api/debug/files

Lists all files in `public/assets` and `public/userast`.

- **Auth**: `portal.debug.view` permission
- **Response**: `{ assets: string[], userast: string[] }`

### POST /api/debug/upload

Uploads a file to static or user asset directory.

- **Auth**: `dev_debug` permission
- **Query**: `?mode=static|user`, `?keepName=true`
- **Response**: `{ permalink }`

### POST /api/debug/deepseek/sessions

Creates a new DeepSeek chat session.

- **Auth**: `dev_deepseek` permission
- **Body**: `{ sessionName }`
- **Response**: Session object

### GET /api/debug/deepseek/sessions/:id

Retrieves a DeepSeek chat session.

- **Auth**: `portal.deepseek.view` permission
- **Response**: Session object

### DELETE /api/debug/deepseek/sessions/:id

Deletes a DeepSeek chat session.

- **Auth**: `dev_deepseek` permission
- **Response**: `{ success, message, deletedSessionId }`

### POST /api/debug/deepseek/sessions/:id/message

Sends a message to a DeepSeek session with tool calling support.

- **Auth**: `dev_deepseek` + session
- **Body**: `{ message, role, toolCallId?, toolResult? }`
- **Response**: `{ sessionId, userMessage, allMessages, toolCalls, assistantMessage, hasMoreToolCalls }`

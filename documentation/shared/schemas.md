---
title: Zod Schemas
description: API input validation schemas defined in shared/schemas.ts
---

# Zod Schemas

All API input validation is performed using [Zod](https://zod.dev) schemas defined in `shared/schemas.ts`. Every API endpoint must validate its input using `readValidatedBody(event, Schema.parse)` or `getValidatedQuery(event, Schema.parse)`.

::: info Source
`shared/schemas.ts`
:::

## Reusable Primitives

These are building blocks composed into the request schemas below.

### `BasisEmail`

```ts
const BasisEmail = z
  .email()
  .refine(
    (s) => s.toLowerCase().endsWith('@basischina.com'),
    'Please use a @basischina.com email'
  )
```

A valid email that must end with `@basischina.com`. Used wherever a user email is required.

### `TeamName`

```ts
const TeamName = z
  .string()
  .min(2, 'Team name must be at least 2 characters')
  .max(30, 'Team name cannot be longer than 30 characters')
```

A string between 2 and 30 characters.

### `TeamPathway`

```ts
const TeamPathway = z.enum(['junior', 'senior'])
```

Must be `'junior'` or `'senior'`.

### `BooleanString`

```ts
const BooleanString = z
  .enum(['true', 'false'])
  .transform((s) => s === 'true')
```

Accepts the literal strings `'true'` or `'false'` and transforms them into a boolean. Useful for query parameters.

### `ZeroToFive`

```ts
const ZeroToFive = z.number().int().min(0).max(5)
```

An integer between 0 and 5 inclusive. Used for rubric criterion scores.

### `ScoreValues`

```ts
const ScoreValues = z.object(
  Object.keys(rubrics['junior']).reduce(
    (obj, key) => ({ ...obj, [key]: ZeroToFive }),
    {} as Record<keyof (typeof rubrics)['junior'], typeof ZeroToFive>
  )
)
```

An object whose keys are the rubric criteria (`originality`, `presentation`, `technicality`, `theme`, `impact`) and whose values are each `ZeroToFive`. Dynamically generated from the rubric definitions in `shared/rubric.ts`.

---

## Authentication Schemas

### `SendCodeRequest`

| Field | Type | Constraints |
|-------|------|-------------|
| `email` | `BasisEmail` | Must be a `@basischina.com` email |

**API endpoint:** `POST /api/auth/code`

### `LoginRequest`

| Field | Type | Constraints |
|-------|------|-------------|
| `email` | `BasisEmail` | Must be a `@basischina.com` email |
| `code` | `number[]` | Array of exactly 6 digits, each 0–9 |

**API endpoint:** `POST /api/auth/login`

### `MicrosoftRedirectRequest`

| Field | Type | Constraints |
|-------|------|-------------|
| `token` | `string` | Required |

**API endpoint:** `POST /api/oauth2/to_microsoft`

---

## Team Schemas

### `CreateTeamQuery`

| Field | Type | Constraints |
|-------|------|-------------|
| `add` | `BooleanString` | Optional. If `true`, the creating user is added to the team |

**API endpoint:** `POST /api/teams` (query parameter)

### `CreateTeamRequest`

| Field | Type | Constraints |
|-------|------|-------------|
| `name` | `TeamName` | 2–30 characters |

**API endpoint:** `POST /api/teams` (request body)

### `UpdateTeamRequest`

| Field | Type | Constraints |
|-------|------|-------------|
| `name` | `TeamName` | Optional, 2–30 characters |
| `pathway` | `TeamPathway` | Optional, `'junior'` or `'senior'` |
| `project` | `object` | Optional, see project sub-schema below |

**Project sub-schema:**

| Field | Type | Constraints |
|-------|------|-------------|
| `project.name` | `string` | Optional, max 50 characters |
| `project.description` | `string` | Optional, max 2000 characters |
| `project.demo_url` | `string \| null` | Optional, valid URL or empty string (transformed to `null`) |
| `project.repo_url` | `string \| null` | Optional, valid URL or empty string (transformed to `null`) |
| `project.sourcing` | `string` | Optional, max 2000 characters |

**API endpoint:** `PATCH /api/teams/:id`

### `SubmitTeamRequest`

| Field | Type | Constraints |
|-------|------|-------------|
| `pathway` | `TeamPathway` | Required, `'junior'` or `'senior'` |
| `project` | `object` | Required, see project sub-schema below |

**Project sub-schema:**

| Field | Type | Constraints |
|-------|------|-------------|
| `project.name` | `string` | Required, non-empty |
| `project.description` | `string` | Required, minimum 30 characters |
| `project.demo_url` | `string` | Required, valid URL |
| `project.repo_url` | `string` | Required, valid URL |
| `project.sourcing` | `string` | Optional, max 2000 characters |

**API endpoint:** `POST /api/teams/:id/submit`

### `AddTeamMemberRequest`

| Field | Type | Constraints |
|-------|------|-------------|
| `email` | `BasisEmail` | Must be a `@basischina.com` email |

**API endpoint:** `POST /api/teams/:id/users`

---

## User Schema

### `UpdateUserRequest`

| Field | Type | Constraints |
|-------|------|-------------|
| `name` | `string` | Optional, max 30 characters |
| `profile_theme_image` | `File \| string \| null` | Optional. File must be ≤ 10 MB and JPEG/PNG/WebP. String must start with `'data'` (data URI). `null` clears the image. |
| `avatar` | `File \| string \| null` | Optional. Same constraints as `profile_theme_image`. |

**Image validation details:**
- Maximum file size: 10 MB (`10 * 1024 * 1024` bytes)
- Accepted MIME types: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`
- Data URIs are accepted (string starting with `'data'`)

**API endpoint:** `PATCH /api/users/:id`

---

## Scoring & Voting Schemas

### `CreateTeamScoresRequest`

| Field | Type | Constraints |
|-------|------|-------------|
| `reasoning` | `string` | 10–2000 characters |
| `scores` | `ScoreValues` | Object with rubric criteria keys, each 0–5 |

**API endpoint:** `POST /api/teams/:id/scores`

### `SubmitVoteRequest`

| Field | Type | Constraints |
|-------|------|-------------|
| `scores` | `number[]` | Array of integers, each 1–5 |
| `reasoning` | `string` | 30–2000 characters |

**Refinement:** `scores.reduce((a, b) => a + b, 0) === 12` — the scores **must sum to exactly 12**.

**API endpoint:** `PATCH /api/ballot`

---

## OAuth2 Application Schemas

### `CreateApplicationRequest`

| Field | Type | Constraints |
|-------|------|-------------|
| `name` | `string` | Required, 1–64 characters |
| `description` | `string` | Optional, max 1024 characters |
| `proxy_microsoft` | `boolean` | Required |
| `type` | `'first' \| 'third'` | Optional |

**API endpoint:** `POST /api/applications`

### `ManageRedirectUriRequest`

| Field | Type | Constraints |
|-------|------|-------------|
| `uri` | `string` | Required, must be a valid URL starting with `https://` or `http://localhost` |

**API endpoint:** `POST /api/applications/:id/redirect_uris`

---

## OAuth2 Token & Session Schemas

### `OAuth2TokenRequest`

| Field | Type | Constraints |
|-------|------|-------------|
| `grant_type` | `'authorization_code'` | Literal, only this grant type is supported |
| `code` | `string` | Required, non-empty authorization code |
| `client_id` | `string` | Required, non-empty |
| `client_secret` | `string` | Required, non-empty |
| `redirect_uri` | `string` | Optional |
| `code_verifier` | `string` | Optional, used for PKCE |

**API endpoint:** `POST /api/oauth2/token`

### `OAuth2SessionActionRequest`

| Field | Type | Constraints |
|-------|------|-------------|
| `action` | `'cancel' \| 'consent' \| 'assume_consent' \| 'deny'` | Required, must be one of the four actions |

**API endpoint:** `DELETE /api/oauth2/session`

---

## Season Schema

### `SetActiveSeasonRequest`

| Field | Type | Constraints |
|-------|------|-------------|
| `season_id` | `number \| null` | Integer, positive, or `null` to unset |

**API endpoint:** `PATCH /api/seasons/active`

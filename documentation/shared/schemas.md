# Zod Schemas

All API input validation uses Zod schemas defined in `shared/schemas.ts`. These schemas are shared between the frontend (form validation) and backend (API validation) to ensure consistency.

## Base Validators

### BasisEmail

```typescript
const BasisEmail = z.email().refine(
  (s) => s.toLowerCase().endsWith('@basischina.com'),
  'Please use a @basischina.com email'
)
```

Validates that the email belongs to the `@basischina.com` domain.

### TeamName

```typescript
const TeamName = z.string().min(2).max(30)
```

### TeamPathway

```typescript
const TeamPathway = z.enum(['junior', 'senior'])
```

### BooleanString

```typescript
const BooleanString = z.enum(['true', 'false']).transform((s) => s === 'true')
```

Parses string query parameters into boolean values.

## Request Schemas

### SendCodeRequest

```typescript
{ email: BasisEmail, token: string }
```

Used by `POST /api/auth/code` to send a login code.

### LoginRequest

```typescript
{ email: BasisEmail, code: number[6], token: string }
```

Used by `POST /api/auth/login` to verify a login code. The `code` must be an array of exactly 6 digits (0–9).

### MicrosoftRedirectRequest

```typescript
{ token: string }
```

Used by `POST /api/oauth2/to_microsoft` to initiate Microsoft login.

### CreateTeamRequest

```typescript
{ name: TeamName }
```

Used by `POST /api/teams` to create a new team.

### CreateTeamQuery

```typescript
{ add?: BooleanString }
```

Query parameters for `POST /api/teams` — whether to auto-join the creator.

### UpdateTeamRequest

```typescript
{
  name?: TeamName,
  pathway?: TeamPathway,
  project?: {
    name?: string.max(50),
    description?: string.max(2000),
    demo_url?: url | '' → null,
    repo_url?: url | '' → null
  }
}
```

Used by `PATCH /api/teams/:id` to update team details. Empty strings for URLs are transformed to `null`.

### SubmitTeamRequest

```typescript
{
  pathway: TeamPathway,
  project: {
    name: string.nonempty(),
    description: string.min(30),
    demo_url: url,
    repo_url: url
  }
}
```

Used by `POST /api/teams/:id/submit` for final project submission. Stricter validation than update.

### AddTeamMemberRequest

```typescript
{ email: BasisEmail }
```

Used by `POST /api/teams/:id/users` to add a team member.

### UpdateUserRequest

```typescript
{
  name?: string.max(30),
  profile_theme_image?: File | dataURL | null,
  avatar?: File | dataURL | null
}
```

Used by `PATCH /api/users/:id` to update user profile. File uploads are validated:
- Max size: 10MB
- Accepted types: JPEG, PNG, WebP

### CreateTeamScoresRequest

```typescript
{
  reasoning: string.min(10).max(2000),
  scores: Record<keyof RubricKeys, ZeroToFive>
}
```

Used by `POST /api/teams/:id/scores` for judge scoring. The `scores` object is dynamically built from the rubric criteria keys.

### SubmitVoteRequest

```typescript
{
  scores: number[].int.min(1).max(5),
  reasoning: string.min(30).max(2000)
}
// Refinement: scores must sum to exactly 12
```

Used by `PATCH /api/ballot` for peer voting. The scores array must sum to exactly 12.

### CreateApplicationRequest

```typescript
{
  name: string.min(1).max(64),
  description?: string.max(1024),
  proxy_microsoft: boolean,
  type?: 'first' | 'third'
}
```

Used by `POST /api/applications` to create an OAuth2 application.

### ManageRedirectUriRequest

```typescript
{
  uri: string.min(1).url()
    .refine(val => val.startsWith('https://') || val.startsWith('http://localhost'))
}
```

Used by `POST /api/applications/:id/redirect_uris`. Redirect URIs must use HTTPS or localhost.

### OAuth2TokenRequest

```typescript
{
  grant_type: 'authorization_code',
  code: string.min(1),
  client_id: string.min(1),
  client_secret: string.min(1),
  redirect_uri?: string,
  code_verifier?: string
}
```

Used by `POST /api/oauth2/token` for the standard OAuth2 token exchange.

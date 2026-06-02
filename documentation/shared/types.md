# Type Definitions

TypeScript types are defined in three files within `shared/`:

## Database Types — `database.d.ts`

Types that exactly match the database schema. These should stay in sync with `sql/init.sql`.

### HackathonStatus

```typescript
type HackathonStatus = 'not_started' | 'in_progress' | 'voting' | 'finished' | 'paused'
```

### TeamPathway

```typescript
type TeamPathway = 'junior' | 'senior'
```

### Hackathon

| Field | Type | Description |
|-------|------|-------------|
| `id` | `1` | Always 1 (CHECK constraint) |
| `status` | `HackathonStatus` | Current event status |
| `voting_enabled` | `number` | Peer voting active flag |
| `results_published` | `number` | Results visible flag |
| `submitted_count` | `number` | Number of submitted projects |
| `max_votes_per_user` | `number` | Max votes per user |
| `judging_open` | `number` | Judge scoring active flag |
| `schedule_start` | `string \| null` | ISO datetime |
| `schedule_end` | `string \| null` | ISO datetime |
| `start_timestamp` | `number` | Event start |
| `end_timestamp` | `number` | Event end |
| `voting_start_timestamp` | `number` | Voting start |
| `voting_end_timestamp` | `number` | Voting end |
| `results_open_timestamp` | `number` | Results publication |
| `theme_name` | `string \| null` | Theme name |
| `theme_description` | `string \| null` | Theme description |

### Team

| Field | Type |
|-------|------|
| `id` | `number` |
| `name` | `string` |
| `pathway` | `TeamPathway \| null` |
| `score` | `number \| null` |
| `rank` | `number \| null` |
| `project_name` | `string` |
| `project_description` | `string` |
| `project_demo_url` | `string \| null` |
| `project_repo_url` | `string \| null` |
| `project_submitted` | `number` |

### TeamScores

| Field | Type |
|-------|------|
| `id` | `number` |
| `team_id` | `number` |
| `judge_user_id` | `number` |
| `scores` | `string` (JSON) |
| `reasoning` | `string` |

### User

| Field | Type |
|-------|------|
| `id` | `number` |
| `email` | `string` |
| `role` | `string` |
| `name` | `string \| null` |
| `team_id` | `number \| null` |
| `login_code` | `string \| null` |
| `login_expiry` | `number \| null` |
| `profile_theme` | `string \| null` |
| `profile_picture` | `string \| null` |

### Ballot

| Field | Type |
|-------|------|
| `id` | `number` |
| `user_id` | `number` |
| `reasoning` | `string \| null` |
| `submitted` | `number` |

### BallotScore

| Field | Type |
|-------|------|
| `id` | `number` |
| `ballot_id` | `number` |
| `project_id` | `number` |
| `score` | `1 \| 2 \| 3 \| 4 \| 5 \| null` |

### OAuth2Application

| Field | Type |
|-------|------|
| `client_id` | `string` |
| `client_secret` | `string` |
| `redirect_uris` | `string \| null` |
| `permissions` | `string \| null` |
| `name` | `string` |
| `description` | `string \| null` |
| `proxy_microsoft` | `number` |
| `type` | `'first' \| 'third'` |
| `profile_picture` | `string \| null` |
| `owner_id` | `number \| null` |

## API Response Types — `responses.d.ts`

Types for public API responses (internal fields stripped, data restructured).

### ProfileTheme

```typescript
interface ProfileTheme {
  mode: 'url' | 'emoji' | 'gradient'
  value: string
}
```

### APIUser

| Field | Type |
|-------|------|
| `id` | `number` |
| `email` | `string` |
| `role` | `string` |
| `name` | `string \| null` |
| `team_id` | `number \| null` |
| `profile_theme` | `ProfileTheme \| null` |
| `profile_picture` | `string \| null` |

### APITeam

| Field | Type |
|-------|------|
| `id` | `number` |
| `name` | `string` |
| `pathway` | `TeamPathway \| null` |
| `rank` | `number \| null` |
| `score` | `number \| null` |
| `project` | `{ name, description, demo_url, repo_url, submitted }` |

### GetUserResponse

Extends `APIUser` with `team: APITeam | null`.

### GetBallotResponse

| Field | Type |
|-------|------|
| `id` | `number` |
| `projects` | `(APITeam['project'] & { id: number })[]` |
| `scores` | `(1 \| 2 \| 3 \| 4 \| 5)[] \| null` |
| `reasoning` | `string \| null` |

## Session Type — `auth.d.ts`

Augments the `nuxt-auth-utils` session user type:

```typescript
declare module '#auth-utils' {
  interface User {
    id: number
  }
}
```

This ensures `useUserSession().user` has the correct `id` property.

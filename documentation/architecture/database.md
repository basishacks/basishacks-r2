# Database

## Schema Overview

The database consists of 6 tables managed through `better-sqlite3` (local) or Cloudflare D1 (production).

### Entity Relationship

```
┌──────────────┐       ┌──────────────┐
│  hackathon   │       │    users     │
│  (id = 1)    │       │              │
└──────────────┘       │ team_id ─────┼──────┐
                       └──────────────┘      │
                              │               │
┌──────────────┐       ┌──────┴───────────────┼──────┐
│    teams     │       │                       │      │
│              │◄──────┘                       │      │
│  id          │                               │      │
│  name        │                       ┌───────┘      │
│  pathway     │                       │              │
│  score       │                       │      ┌───────┘
│  rank        │                       │      │
│  project_*   │                       │      │
└──────┬───────┘                       │      │
       │                               │      │
┌──────┴───────┐                ┌──────┴──────┼──────────┐
│ team_scores  │                │   ballots   │          │
│              │                │             │          │
│ team_id ─────┤                │ user_id ────┤          │
│ judge_user_id┤                └──────┬──────┘          │
└──────────────┘                       │                 │
                                ┌──────┴──────────┐      │
                                │ ballot_scores   │      │
                                │                 │      │
                                │ ballot_id ──────┤      │
                                │ project_id ─────┼──────┘
                                └─────────────────┘

┌──────────────────────┐
│ oauth2_applications  │
│                      │
│  client_id (PK)      │
│  client_secret       │
│  permissions         │
│  redirect_uris       │
│  name                │
│  description         │
│  proxy_microsoft     │
│  type                │
│  profile_picture     │
│  owner_id            │
└──────────────────────┘
```

## Tables

### hackathon

The single-row table controlling the global event state.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Always `1` (CHECK constraint) |
| `status` | TEXT | `not_started`, `in_progress`, `voting`, `finished`, `paused` |
| `voting_enabled` | INTEGER | Whether peer voting is active |
| `results_published` | INTEGER | Whether results are visible |
| `submitted_count` | INTEGER | Number of submitted projects |
| `max_votes_per_user` | INTEGER | Maximum votes allowed per user |
| `judging_open` | INTEGER | Whether judge scoring is open |
| `schedule_start` | TEXT | ISO datetime for schedule start |
| `schedule_end` | TEXT | ISO datetime for schedule end |
| `start_timestamp` | INTEGER | Event start timestamp |
| `end_timestamp` | INTEGER | Event end timestamp |
| `voting_start_timestamp` | INTEGER | Voting phase start |
| `voting_end_timestamp` | INTEGER | Voting phase end |
| `results_open_timestamp` | INTEGER | Results publication time |
| `theme_name` | TEXT | Hackathon theme name (hidden before event) |
| `theme_description` | TEXT | Theme description (hidden before event) |

### teams

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK | Auto-increment |
| `name` | TEXT | Team name (2–30 chars) |
| `pathway` | TEXT | `junior`, `senior`, or NULL |
| `score` | INTEGER | Final score (out of 100) |
| `rank` | INTEGER | 1-based ranking |
| `project_name` | TEXT | Submitted project name |
| `project_description` | TEXT | Submitted project description |
| `project_demo_url` | TEXT | Demo URL |
| `project_repo_url` | TEXT | Repository URL |
| `project_submitted` | INTEGER | 0 = not submitted, 1 = submitted |

Indexes: `teams_score`, `teams_rank`

### users

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK | Auto-increment |
| `email` | TEXT UNIQUE | `@basischina.com` email |
| `role` | TEXT | Permission string (e.g., `participant`, `admin`, or dot-notation permissions) |
| `name` | TEXT | Display name |
| `team_id` | INTEGER FK | Reference to teams.id |
| `login_code` | TEXT | 6-digit magic code |
| `login_expiry` | INTEGER | Code expiration timestamp |
| `profile_theme` | TEXT | `"mode\|value"` string (url, emoji, gradient) |
| `profile_picture` | TEXT | Profile picture asset path |

Indexes: `idx_users_email`, `idx_users_lower_email`, `idx_users_team_id`

### team_scores

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK | Auto-increment |
| `team_id` | INTEGER FK | Reference to teams.id |
| `judge_user_id` | INTEGER FK | Reference to users.id |
| `scores` | TEXT | JSON object of rubric scores |
| `reasoning` | TEXT | Judge's reasoning text |

Unique constraint: `(team_id, judge_user_id)`

### ballots

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK | Auto-increment |
| `user_id` | INTEGER FK UNIQUE | Reference to users.id |
| `reasoning` | TEXT | Voter's reasoning |
| `submitted` | INTEGER | 0 = draft, 1 = submitted |

### ballot_scores

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK | Auto-increment |
| `ballot_id` | INTEGER FK | Reference to ballots.id (CASCADE delete) |
| `project_id` | INTEGER FK | Reference to teams.id |
| `score` | INTEGER | 1–5 or NULL |

Unique constraint: `(ballot_id, project_id)`

### oauth2_applications

| Column | Type | Description |
|--------|------|-------------|
| `client_id` | TEXT PK | UUID identifier |
| `client_secret` | TEXT | Space-separated SHA-256 hashes |
| `permissions` | TEXT | Space-separated scope strings |
| `redirect_uris` | TEXT | Space-separated URI strings |
| `name` | TEXT | Application name |
| `description` | TEXT | Application description |
| `proxy_microsoft` | INTEGER | Whether to proxy Microsoft login |
| `type` | TEXT | `first` or `third` party |
| `profile_picture` | TEXT | Application icon asset path |
| `owner_id` | INTEGER | Creator's user ID |

## Database Access Pattern

All database access follows this pattern:

```typescript
// 1. Get the database from event context
const db = event.context.db

// 2. Prepare a SQL statement
const stmt = db.prepare('SELECT * FROM users WHERE id = ?')

// 3. Bind parameters and execute
const user = stmt.bind(userId).first<User>()

// For multiple results
const { results } = stmt.bind(userId).all<User>()

// For mutations
const result = stmt.bind(name).run()
const changes = result.meta.changed_db
```

## Per-Table Helpers

Database helpers are organized in `server/utils/database/`:

| File | Functions |
|------|-----------|
| `ballots.ts` | `createBallot`, `getBallotByUser`, `updateBallot`, `createBallotScore`, `getBallotScores`, `getBallotScoresByTeamID`, `updateBallotScore` |
| `hackathon.ts` | `getHackathon` |
| `members.ts` | `getTeamMembers`, `removeTeamMember`, `addTeamMember` |
| `oauth2_applications.ts` | CRUD, secret management, redirect URI management, scope management |
| `scores.ts` | `createTeamScores`, `getTeamScoresByTeamID` |
| `teams.ts` | `getTeam`, `getAllTeams`, `getSubmittedUnjudgedTeams`, `getSubmittedTeams`, `createTeam`, `updateTeam`, `deleteTeams` |
| `users.ts` | `getUser`, `getUserByEmail`, `addCodeToUser`, `getUserByCode`, `updateUserName`, `updateUserProfileTheme`, `updateUserProfilePicture`, `updateUserRole`, `deleteUsers` |

## Migrations

Migrations are stored as SQL files in the `sql/` directory:

- `init.sql` — Base schema with all tables and indexes
- `migration-YYYY-MM-DD-HH-MMZ.sql` — Dated migrations for schema changes
- `patch-N-YYYY-M-D-description.sql` — Feature patches

There is no automated migration runner. Apply migrations manually:

```bash
# Local
bunx wrangler d1 execute DB --file sql/migration-xxx.sql

# Production
bunx wrangler d1 execute DB --file sql/migration-xxx.sql --remote
```

The `seed-hackathon.ts` Nitro plugin also handles some schema evolution by checking for missing columns and adding them with `ALTER TABLE`.

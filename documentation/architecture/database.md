---
title: Database
description: Database schema, access patterns, per-table helpers, type conventions, and migration strategy for basishacks.
---

# Database

basishacks uses SQLite with a runtime-agnostic driver layer for both local development and production: `bun:sqlite` under Bun and `better-sqlite3` under Node.js. The database file uses WAL mode. All database access goes through Drizzle ORM, which provides type-safe queries.

## Tables

### `hackathon` (singleton)

The hackathon table always has exactly one row (`id = 1`) that controls the global event state.

| Column | Type | Description |
| --- | --- | --- |
| `id` | `INTEGER PRIMARY KEY CHECK (id = 1)` | Always 1 |
| `status` | `TEXT` | One of: `not_started`, `in_progress`, `voting`, `finished`, `paused` |
| `voting_enabled` | `INTEGER` | Whether peer voting is enabled |
| `results_published` | `INTEGER` | Whether results are visible |
| `submitted_count` | `INTEGER` | Number of submitted projects |
| `max_votes_per_user` | `INTEGER` | Maximum votes allowed per user |
| `judging_open` | `INTEGER` | Whether judge scoring is open |
| `schedule_start` | `TEXT` | ISO timestamp for event start |
| `schedule_end` | `TEXT` | ISO timestamp for event end |
| `start_timestamp` | `INTEGER` | Event start timestamp |
| `end_timestamp` | `INTEGER` | Event end timestamp |
| `voting_start_timestamp` | `INTEGER` | Voting period start |
| `voting_end_timestamp` | `INTEGER` | Voting period end |
| `results_open_timestamp` | `INTEGER` | Results visibility timestamp |
| `theme_name` | `TEXT` | Hackathon theme name |
| `theme_description` | `TEXT` | Hackathon theme description |

### `teams`

| Column                | Type                                | Description                   |
| --------------------- | ----------------------------------- | ----------------------------- |
| `id`                  | `INTEGER PRIMARY KEY AUTOINCREMENT` | Team ID                       |
| `name`                | `TEXT NOT NULL`                     | Team name                     |
| `pathway`             | `TEXT`                              | `junior`, `senior`, or `NULL` |
| `score`               | `INTEGER`                           | Final score (out of 100)      |
| `rank`                | `INTEGER`                           | 1-based ranking               |
| `project_name`        | `TEXT NOT NULL DEFAULT ''`          | Submitted project name        |
| `project_description` | `TEXT NOT NULL DEFAULT ''`          | Project description           |
| `project_demo_url`    | `TEXT`                              | Demo URL                      |
| `project_repo_url`    | `TEXT`                              | Repository URL                |
| `project_submitted`   | `INTEGER NOT NULL DEFAULT 0`        | Whether project is submitted  |
| `sourcing`            | `TEXT NOT NULL DEFAULT ''`          | Sourcing information          |
| `season_id`           | `INTEGER NOT NULL`                  | FK to `seasons.id`            |

### `team_scores`

Stores judge scores for each team. Each judge can score a team exactly once.

| Column | Type | Description |
| --- | --- | --- |
| `team_id` | `INTEGER NOT NULL` | FK to `teams.id` |
| `judge_user_id` | `INTEGER NOT NULL` | FK to `users.id` |
| `scores` | `TEXT NOT NULL` | JSON object of rubric scores |
| `reasoning` | `TEXT NOT NULL DEFAULT '<no reasoning provided>'` | Judge's reasoning |
| `season_id` | `INTEGER` | FK to `seasons.id` |

**Primary key**: `(team_id, judge_user_id)`

### `users`

| Column | Type | Description |
| --- | --- | --- |
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | User ID |
| `email` | `TEXT NOT NULL UNIQUE` | User email |
| `role` | `TEXT NOT NULL DEFAULT 'participant'` | Space-separated permission string |
| `name` | `TEXT` | Display name |
| `team_id` | `INTEGER` | FK to `teams.id` |
| `login_code` | `TEXT` | Legacy login code (unused by current authentication) |
| `login_expiry` | `INTEGER` | Legacy login code expiry timestamp |
| `profile_theme` | `TEXT` | Profile theme as `"mode\|value"` |
| `profile_picture` | `TEXT` | Profile picture URL or identifier |

::: warning The `role` column originally had a `CHECK` constraint limiting it to `participant`, `judge`, or `admin`. This was removed via `migration-permissions.sql` to support space-separated permission strings such as `"participant portal.users.view portal.teams.view"`. :::

### `ballots`

Each user has exactly one ballot for peer voting.

| Column      | Type                                | Description                 |
| ----------- | ----------------------------------- | --------------------------- |
| `id`        | `INTEGER PRIMARY KEY AUTOINCREMENT` | Ballot ID                   |
| `user_id`   | `INTEGER NOT NULL`                  | FK to `users.id` (unique)   |
| `reasoning` | `TEXT`                              | Voter's reasoning           |
| `submitted` | `INTEGER NOT NULL DEFAULT 0`        | Whether ballot is submitted |

### `ballot_scores`

Individual project scores within a ballot. Scores must be 1–5 or null.

| Column       | Type                                | Description                            |
| ------------ | ----------------------------------- | -------------------------------------- |
| `id`         | `INTEGER PRIMARY KEY AUTOINCREMENT` | Score ID                               |
| `ballot_id`  | `INTEGER NOT NULL`                  | FK to `ballots.id` (ON DELETE CASCADE) |
| `project_id` | `INTEGER NOT NULL`                  | FK to `teams.id`                       |
| `score`      | `INTEGER`                           | 1, 2, 3, 4, 5, or NULL                 |

**Unique constraint**: `(ballot_id, project_id)`

### `oauth2_applications`

| Column            | Type                         | Description                    |
| ----------------- | ---------------------------- | ------------------------------ |
| `client_id`       | `TEXT PRIMARY KEY`           | UUID-based application ID      |
| `client_secret`   | `TEXT NOT NULL`              | Space-separated SHA-256 hashes |
| `permissions`     | `TEXT`                       | Space-separated allowed scopes |
| `redirect_uris`   | `TEXT`                       | Space-separated redirect URIs  |
| `name`            | `TEXT NOT NULL`              | Application display name       |
| `description`     | `TEXT`                       | Application description        |
| `proxy_microsoft` | `INTEGER NOT NULL DEFAULT 0` | Whether app proxies MS Graph   |
| `type`            | `TEXT`                       | `first` or `third`             |
| `profile_picture` | `TEXT`                       | Application icon               |
| `owner_id`        | `INTEGER`                    | FK to `users.id`               |

### `seasons`

| Column      | Type                                | Description                                  |
| ----------- | ----------------------------------- | -------------------------------------------- |
| `id`        | `INTEGER PRIMARY KEY AUTOINCREMENT` | Season ID                                    |
| `name`      | `TEXT NOT NULL UNIQUE`              | Season name                                  |
| `is_active` | `INTEGER NOT NULL DEFAULT 0`        | Only one season can be active (CHECK 0 or 1) |

A partial unique index ensures at most one active season:

```sql
CREATE UNIQUE INDEX idx_seasons_active ON seasons(is_active) WHERE is_active = 1;
```

### `user_past_teams`

Junction table tracking which teams a user has belonged to historically.

| Column    | Type               | Description                          |
| --------- | ------------------ | ------------------------------------ |
| `user_id` | `INTEGER NOT NULL` | FK to `users.id` (ON DELETE CASCADE) |
| `team_id` | `INTEGER NOT NULL` | FK to `teams.id` (ON DELETE CASCADE) |

**Primary key**: `(user_id, team_id)`

### `team_awards`

Stores per-team award assignments. Award definitions live in `shared/awards.ts` (`AWARD_REGISTRY`); the database only stores the award namespace and JSON metadata, which are resolved at read time.

| Column    | Type               | Description                                     |
| --------- | ------------------ | ----------------------------------------------- |
| `team_id` | `INTEGER NOT NULL` | FK to `teams.id` (ON DELETE CASCADE)            |
| `award`   | `TEXT NOT NULL`    | Award namespace from `AWARD_REGISTRY`           |
| `meta`    | `TEXT NOT NULL`    | JSON metadata for the assignment (default `{}`) |

**Primary key**: `(team_id, award)`

## Access Patterns

All database access goes through `event.context.drizzle` (a Drizzle ORM instance). Per-table helpers in `server/utils/database/*.ts` wrap common queries:

```ts
// Read a single row via the users helper
import { getUser } from "~~/server/utils/database/users";
const user = await getUser(event, userId);

// Read multiple rows via the teams helper
import { getTeamsBySeason } from "~~/server/utils/database/teams";
const teams = await getTeamsBySeason(event, seasonId);

// Write via the users helper
import { updateUserName } from "~~/server/utils/database/users";
await updateUserName(event, userId, name);
```

For queries not covered by a helper, use the Drizzle instance directly:

```ts
import { users } from "~~/server/database/schema";

const drizzle = event.context.drizzle;
const user = await drizzle.select().from(users).where(eq(users.id, userId)).get();
```

::: tip Always use Drizzle's parameterized query builders. Never interpolate user input directly into SQL strings. :::

## Per-table Helpers

Each table has a dedicated helper module in `server/utils/database/`:

| File | Key Functions |
| --- | --- |
| `users.ts` | `getUser`, `getUserByEmail`, `addCodeToUser`, `updateUserName`, `updateUserProfileTheme` |
| `teams.ts` | Team CRUD, project submission |
| `members.ts` | Team member management |
| `scores.ts` | Judge score CRUD |
| `ballots.ts` | Ballot and ballot score management |
| `hackathon.ts` | Hackathon state queries and updates |
| `oauth2_applications.ts` | Application CRUD, secret management, redirect URI management |
| `seasons.ts` | `getSeasons`, `getSeasonById`, `getActiveSeason`, `setActiveSeason` |
| `awards.ts` | `getAwards`, `getAwardsForTeams`, `createAward`, `deleteTeamAwards`, `deleteAward` |

## Type Conventions

TypeScript types in `shared/database.d.ts` must stay in sync with the SQL schema. These types represent raw database rows:

```ts
interface User {
    id: number;
    email: string;
    role: string;
    name: string | null;
    team_id: number | null;
    login_code: string | null;
    login_expiry: number | null;
    profile_theme: string | null;
    profile_picture: string | null;
}
```

API response types in `shared/responses.d.ts` represent the public-facing shape after conversion:

```ts
interface APIUser {
    id: number;
    email: string;
    role: string;
    name: string | null;
    team_id: number | null;
    profile_theme: ProfileTheme | null; // parsed from "mode|value"
    profile_picture: string | null;
}
```

The conversion is handled by `convertUserToPublic()` and `convertTeamToPublic()` in `server/utils/convert.ts`.

## Profile Themes

Profile themes are stored in the database as `"mode|value"` strings and parsed into structured objects in the API layer:

```ts
// Database storage: "gradient|from-blue-500 to-purple-600"
// API response: { mode: "gradient", value: "from-blue-500 to-purple-600" }
```

Allowed modes: `url`, `emoji`, `gradient`. If the mode is unrecognized, it defaults to `emoji`.

## Migrations

Migrations are stored as SQL files in the `drizzle/` directory. On server startup, `server/database/migrate.ts` reads these files in lexicographic order and applies any that have not yet been recorded in the `_drizzle_migrations` tracking table.

This runtime-agnostic custom runner works with both `bun:sqlite` and `better-sqlite3`, so the server can migrate the database regardless of which runtime is used. `bun run db:migrate` is also available as a Drizzle Kit command for manual migration management.

```ts
// server/database/index.ts
import { createAndMigrateDatabase } from "./migrate";
// ...
createAndMigrateDatabase(sqlite);
```

### Migration file format

Files must end in `.sql` and may contain multiple statements separated by:

```sql
--> statement-breakpoint
```

`CREATE TABLE`, `CREATE INDEX`, and `CREATE UNIQUE INDEX` statements are automatically made idempotent (`IF NOT EXISTS`) so they can safely re-run against databases created before migration tracking existed.

### Generating migrations

The `db:generate` script still uses Drizzle Kit to produce migration SQL from `server/database/schema.ts`:

```bash
# Generate a migration after schema changes
bun run db:generate
```

### Applying migrations

```bash
# Apply pending migrations manually (uses Drizzle Kit; Bun users may prefer startup auto-migration)
bun run db:migrate
```

In practice, the dev/prod server applies migrations automatically when `createDrizzleDatabase()` runs during `init-database.ts` plugin initialization.

### Legacy schema repair

`migrateLegacySchema()` in `server/database/migrate.ts` brings databases created from older `sql/archive/init.sql` schemas up to date without dropping data. It adds missing tables and columns:

| Missing Table / Column                 | Action                                                  |
| -------------------------------------- | ------------------------------------------------------- |
| `seasons` table                        | Creates table + unique name index                       |
| `team_awards` table                    | Creates table                                           |
| `peer_voting_scores` table             | Creates table                                           |
| `user_past_teams` table                | Creates table with composite PK                         |
| `hackathon.*` timestamp/status columns | `ALTER TABLE ... ADD COLUMN INTEGER DEFAULT 0/NULL`     |
| `teams.season_id`                      | `ALTER TABLE ... ADD COLUMN INTEGER DEFAULT 1 NOT NULL` |
| `teams.sourcing`                       | `ALTER TABLE ... ADD COLUMN TEXT DEFAULT '' NOT NULL`   |
| `team_scores.season_id`                | `ALTER TABLE ... ADD COLUMN INTEGER`                    |
| `oauth2_applications.owner_id`         | `ALTER TABLE ... ADD COLUMN INTEGER`                    |

### Seeding

After migrations, `seedHackathon()` ensures the `hackathon` singleton row exists, and `seedOAuth2ApplicationRedirectUri()` auto-registers the onsite-login redirect URI for `ONSITE_LOGIN_CLIENT_ID`.

### Notable migrations

| Migration | Description |
| --- | --- |
| `migration-permissions.sql` | Drops the `CHECK` constraint on `users.role` to allow space-separated permission strings |
| `migration-2026-05-20-owner-id.sql` | Adds `owner_id` column to `oauth2_applications` |
| `migration-2026-06-02-18-13Z.sql` | Adds `sourcing` column to `teams` |
| `migration-2026-06-02-21-29Z.sql` | Creates `seasons` table |
| `migration-2026-06-02-21-35Z.sql` | Adds `season_id` to `teams`, seeds default season |
| `migration-2026-06-02-22-00Z.sql` | Adds FK constraint on `teams.season_id` (table recreation) |
| `migration-2026-06-02-22-15Z.sql` | Creates `user_past_teams` junction table |
| `migration-2026-06-27-06-01Z.sql` | Creates the `team_awards` table (legacy archived migration) |

## Foreign Keys

Foreign keys are enforced at the SQLite level:

```sql
PRAGMA foreign_keys = ON;
```

This is set in `createDrizzleDatabase()` (via `server/database/index.ts`) and in the `init-database.ts` plugin. Cascade deletes are configured on:

- `ballot_scores.ballot_id` → `ballots.id` (ON DELETE CASCADE)
- `user_past_teams.user_id` → `users.id` (ON DELETE CASCADE)
- `user_past_teams.team_id` → `teams.id` (ON DELETE CASCADE)
- `team_awards.team_id` → `teams.id` (ON DELETE CASCADE)

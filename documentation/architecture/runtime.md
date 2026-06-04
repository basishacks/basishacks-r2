---
title: Runtime Architecture
description: How basishacks runs in local development versus production, including database initialization, Nitro plugins, and event context augmentations.
---

# Runtime Architecture

basishacks runs in two distinct environments: **local development** with `better-sqlite3`, and **production** on Cloudflare Pages with D1. The codebase is designed so that the same application logic works identically in both.

## Local Development

| Setting | Value |
|---------|-------|
| Nitro preset | `bun` |
| Database | `better-sqlite3` against `./database/basishacks.sqlite` |
| WAL mode | Enabled |
| Foreign keys | Enforced (`PRAGMA foreign_keys = ON`) |
| Dev server port | 24598 |
| HTTPS | Optional (`--https` flag) |

The local dev server is started with:

```bash
bun dev --https
```

## Production (Cloudflare Pages)

| Setting | Value |
|---------|-------|
| Build preset | `cloudflare-pages` |
| Database | Cloudflare D1 (binding name: `DB`) |
| Deployment | GitHub Actions → Cloudflare Pages project `basishacks2025` |

The production build is generated with:

```bash
bun run build --preset cloudflare-pages
```

::: warning
In production on Cloudflare Pages (edge functions), the in-memory rate limiter is per-isolate, not globally distributed. This means rate limiting is approximate under high concurrency.
:::

## Database Wrapper

The `SQLiteDatabase` class (`server/utils/database.ts`) is the core abstraction that makes local and production database access interchangeable.

### Class hierarchy

```
SQLiteDatabase              # Wraps better-sqlite3, mimics D1Database
 └── prepare(sql)           # Returns SQLiteStatement
      ├── bind(...params)   # Returns this (chainable)
      ├── first<T>()        # Returns T | undefined
      ├── all<T>()          # Returns { results: T[] }
      └── run()             # Returns { meta: { changed_db: number } }
```

### Key methods

| Method | Description |
|--------|-------------|
| `prepare(sql)` | Creates a prepared statement wrapper |
| `batch<T>(statements)` | Executes multiple statements in a transaction |
| `exec(sql)` | Runs raw SQL (for schema creation, migrations) |

### Initialization

```ts
// server/utils/database.ts
export function initializeDatabase(): any {
  if (!dbInstance) {
    const dbPath = path.resolve(__dirname, '../../database/basishacks.sqlite')
    dbInstance = new Database(dbPath)
    dbInstance.pragma('journal_mode = WAL')
    dbInstance.pragma('foreign_keys = ON')
  }
  return dbInstance
}

export function createDatabaseWrapper(): SQLiteDatabase {
  const db = getDatabase()
  return new SQLiteDatabase(db)
}
```

## Nitro Plugins

Plugins run at server startup and set up the runtime environment. They are loaded in alphabetical order.

### `init-database.ts`

**Purpose**: Initializes the database schema and attaches the DB wrapper to every request.

1. Calls `initializeDatabase()` to create/open the SQLite file
2. Checks if any tables exist; if not, executes the full schema SQL
3. Registers a `request` hook that creates a fresh `SQLiteDatabase` wrapper and attaches it to `event.context.db`

```ts
export default defineNitroPlugin((nitroApp) => {
  const db = initializeDatabase()

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all().map(r => r.name)
  if (tables.length === 0) {
    db.exec(SCHEMA_SQL)
  }

  nitroApp.hooks.hook('request', (event) => {
    event.context.db = createDatabaseWrapper()
  })
})
```

### `seed-hackathon.ts`

**Purpose**: Seeds the hackathon singleton row and performs auto-migrations for new columns.

1. Checks for missing columns in the `users` and `hackathon` tables via `PRAGMA table_info`
2. Adds any missing columns with `ALTER TABLE ... ADD COLUMN`
3. Upserts the hackathon row with schedule timestamps
4. Inserts the default `basishacks connect` OAuth2 application if it does not exist

::: tip
This plugin acts as a lightweight auto-migration system. It adds new columns that were introduced in migrations without requiring manual SQL execution in local development.
:::

### `microsoft.ts`

**Purpose**: Initializes and manages Microsoft Graph API access tokens.

1. On startup, fetches an app-level access token using client credentials flow
2. Provides `requestMicrosoft()` and `requestUserMicrosoft()` wrappers for Graph API calls
3. Exports higher-level functions such as `createMicrosoftMeeting()` and `createOrGetExistingDirectChat()`
4. Caches direct chat IDs in-memory to avoid repeated Graph API lookups

::: warning
All Microsoft Graph API calls **must** be made through functions exported from this plugin. This is a security policy to ensure auditability of all external API calls.
:::

## Event Context Augmentations

The H3 event context is extended via TypeScript declarations in `server/types/`:

### `cloudflare.d.ts`

```ts
declare module 'h3' {
  interface H3EventContext {
    cf: CfProperties
    db: SQLiteDatabase
  }
}
```

### `oauth2-jwt.d.ts`

```ts
declare module 'h3' {
  interface H3EventContext {
    oauth2?: OAuth2JWTContext
  }
}
```

### Context availability

| Key | Type | Always present? | Set by |
|-----|------|----------------|--------|
| `event.context.db` | `SQLiteDatabase` | Yes | `init-database.ts` request hook |
| `event.context.cf` | `CfProperties` | Production only | Cloudflare runtime |
| `event.context.oauth2` | `OAuth2JWTContext` | Only in OAuth2-protected endpoints | `withOAuth2JWT()` wrapper |

## Request Lifecycle

```
1. Incoming HTTP request
     │
2. Nitro request hook (init-database.ts)
     │  └── event.context.db = createDatabaseWrapper()
     │
3. Server middleware (oauth2-authorize.ts)
     │  └── Validates OAuth2 authorize requests if path matches
     │
4. API route handler
     │  ├── readValidatedBody() / getValidatedQuery() with Zod
     │  ├── requireUser() / requireAdmin() / requirePermission()
     │  └── event.context.db.prepare(sql).bind(...).first()/all()/run()
     │
5. Response
     └── convertUserToPublic() / convertTeamToPublic() to strip internal fields
```

---
title: Runtime Architecture
description: How basishacks runs in local development versus production, including database initialization, Nitro plugins, and event context augmentations.
---

# Runtime Architecture

basishacks runs in two distinct environments: **local development** and **production** on a VPS. The codebase supports dual-runtime operation — under Bun it uses `bun:sqlite`, under Node.js it uses `better-sqlite3`. Drizzle ORM provides the unified query layer.

## Local Development

| Setting | Value |
|---------|-------|
| Nitro preset | `node-server` |
| Database | SQLite via Drizzle ORM (`bun:sqlite` under Bun, `better-sqlite3` under Node.js) |
| WAL mode | Enabled |
| Foreign keys | Enforced (`PRAGMA foreign_keys = ON`) |
| Dev server port | 24598 |
| HTTPS | Optional (`--https` flag) |

The local dev server is started with:

```bash
bun dev --https
```

## Production (VPS / Node.js server)

| Setting | Value |
|---------|-------|
| Build preset | `node-server` |
| Database | SQLite via Drizzle ORM (`bun:sqlite` under Bun, `better-sqlite3` under Node.js) |
| Deployment | Manual or CI/CD to VPS |

The production build is generated with:

```bash
bun run build
```

::: warning
The in-memory rate limiter is per-process. Under high concurrency or with multiple server instances, consider using a shared store (e.g., Redis) for consistent rate limiting.
:::

## Drizzle ORM

The database layer uses Drizzle ORM (`server/database/`) for type-safe queries.

## Nitro Plugins

Plugins run at server startup and set up the runtime environment. They are loaded in alphabetical order.

### `init-database.ts`

**Purpose**: Initializes the database schema and attaches the DB wrapper to every request.

1. Calls `createDrizzleDatabase()` to initialize the SQLite connection
2. Registers a `request` hook that attaches the Drizzle instance to `event.context.drizzle`

```ts
export default defineNitroPlugin(async (nitroApp) => {
  const db = await createDrizzleDatabase()

  const tables = db.all<{ name: string }>(sql`SELECT name FROM sqlite_master WHERE type='table'`)
  console.log(`[Nitro] Database plugin loaded with ${tables.length} tables (Drizzle ORM)`)

  nitroApp.hooks.hook('request', (event) => {
    event.context.drizzle = db
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

### `h3.d.ts`

```ts
declare module 'h3' {
  interface H3EventContext {
    drizzle: BaseSQLiteDatabase<typeof schema>
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
| `event.context.drizzle` | `BaseSQLiteDatabase` | Yes | `init-database.ts` request hook |
| `event.context.oauth2` | `OAuth2JWTContext` | Only in OAuth2-protected endpoints | `withOAuth2JWT()` wrapper |

## Request Lifecycle

```
1. Incoming HTTP request
     │
2. Nitro request hook (init-database.ts)
     │  └── event.context.drizzle = db
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

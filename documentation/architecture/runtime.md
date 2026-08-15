---
title: Runtime Architecture
description: How basishacks runs in local development versus production, including database initialization, Nitro plugins, and event context augmentations.
---

# Runtime Architecture

basishacks runs in two distinct environments: **local development** and **production** on a VPS. The codebase supports dual-runtime operation — under Bun it uses `bun:sqlite`, under Node.js it uses `better-sqlite3`. Drizzle ORM provides the unified query layer.

## Local Development

| Setting | Value |
| --- | --- |
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

| Setting      | Value                                                                           |
| ------------ | ------------------------------------------------------------------------------- |
| Build preset | `node-server`                                                                   |
| Database     | SQLite via Drizzle ORM (`bun:sqlite` under Bun, `better-sqlite3` under Node.js) |
| Deployment   | Manual or CI/CD to VPS                                                          |

The production build is generated with:

```bash
bun run build
```

Nitro leaves runtime dependencies external so its generated bundles resolve them from the deployed `node_modules` directory. This avoids incomplete dependency copies in the development server. The GitHub release workflow runs this build when a `v*` tag is pushed; deploy the resulting `.output/` alongside production dependencies. Before starting a release, create a writable `database/` directory next to `.output/`; the SQLite database is not part of the artifact.

::: warning The in-memory rate limiter is per-process. Under high concurrency or with multiple server instances, consider using a shared store (e.g., Redis) for consistent rate limiting. :::

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
    const db = await createDrizzleDatabase();

    const tables = db.all<{ name: string }>(sql`SELECT name FROM sqlite_master WHERE type='table'`);
    console.log(`[Nitro] Database plugin loaded with ${tables.length} tables (Drizzle ORM)`);

    nitroApp.hooks.hook("request", (event) => {
        event.context.drizzle = db;
    });
});
```

### `validate-environment.ts`

**Purpose**: Validates the encrypted-session password and the four required basis-auth client variables. Missing basis-auth configuration is fatal in production and produces a warning in development.

### `microsoft.ts`

**Purpose**: Initializes and manages Microsoft Graph API access tokens.

1. On startup, fetches an app-level access token using client credentials flow
2. Provides `requestMicrosoft()` and `requestUserMicrosoft()` wrappers for Graph API calls
3. Exports higher-level functions such as `createMicrosoftMeeting()` and `createOrGetExistingDirectChat()`
4. Caches direct chat IDs in-memory to avoid repeated Graph API lookups

::: warning All Microsoft Graph API calls **must** be made through functions exported from this plugin. This is a security policy to ensure auditability of all external API calls. :::

## Event Context Augmentations

The H3 event context is extended via TypeScript declarations in `server/types/`:

### `cloudflare.d.ts`

**File:** `server/types/cloudflare.d.ts`

```ts
declare module "h3" {
    interface H3EventContext {
        /** Drizzle ORM instance (driver-agnostic; backed by bun:sqlite or better-sqlite3) */
        drizzle: BaseSQLiteDatabase<"sync", any, typeof schema>;
    }
}
```

### `oauth2-jwt.d.ts`

```ts
declare module "h3" {
    interface H3EventContext {
        oauth2?: OAuth2JWTContext;
    }
}
```

### Context availability

| Key | Type | Always present? | Set by |
| --- | --- | --- | --- |
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
     │  └── event.context.drizzle.select()/insert()/update()/delete()
     │
5. Response
     └── convertUserToPublic() / convertTeamToPublic() to strip internal fields
```

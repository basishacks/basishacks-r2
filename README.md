# basishacks

The official website for the BIBS-C Network Hackathon (season 2, 2025–26).

## Technology Stack

| Layer           | Technology                                                                  |
| --------------- | --------------------------------------------------------------------------- |
| Framework       | Nuxt 4 (^4.4.8)                                                             |
| UI              | @nuxt/ui ^4.9.0 (Tailwind CSS v4)                                           |
| Language        | TypeScript ^5.9.3                                                           |
| Runtime         | Node.js >= v24 or Bun (dual-runtime support)                                |
| Package Manager | Bun (preferred); npm works                                                  |
| Database        | SQLite via Drizzle ORM (bun:sqlite under Bun, better-sqlite3 under Node.js) |
| Auth            | nuxt-auth-utils 0.5.25 (session-based)                                      |
| Validation      | Zod 4.x (^4.4.3)                                                            |
| Fonts           | @nuxt/fonts ^0.14.0 (local provider)                                        |
| Icons           | @iconify-json/lucide, @iconify-json/material-symbols                        |
| Linting         | @nuxt/eslint 1.10.0 + Prettier ^3.9.4                                       |
| Deployment      | Node.js server (VPS)                                                        |

## Prerequisites

- **Node.js** >= v24, **or** **Bun** (any recent 1.x release)
- Bun is the preferred runtime and package manager; npm works as a fallback
- A SQLite-compatible filesystem (the local DB file lives at `./database/basishacks.sqlite`)

## Installation

```bash
bun install
# or
npm install
```

The `postinstall` script (`nuxt prepare`) runs automatically and generates Nuxt's typed references.

## Environment Setup

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env
```

The canonical list of variables lives in `.env.example`. The table below summarizes which are required and which are optional.

| Variable | Required? | Purpose |
| --- | --- | --- |
| `NUXT_SESSION_PASSWORD` | Required | Session encryption key. Must be at least 32 bytes. Generate with `openssl rand -base64 32` |
| `NUXT_OAUTH2_JWT_SECRET` | Required | JWT signing secret for OAuth2 token exchange. Must be at least 32 bytes. Generate with `openssl rand -base64 32` |
| `ONSITE_LOGIN_CLIENT_ID` | Required for onsite login | OAuth2 `client_id` of the basishacks app used by the `/api/login` -> `/api/oauth2/authorize` onsite flow. The server auto-adds `${CURRENT_URL_ORIGIN}${REDIRECT_URI}` to this app's allowed redirect URIs on startup |
| `MICROSOFT_TENANT_ID` | Required for MS login | Microsoft Entra ID tenant (directory) ID. Must be paired with `MICROSOFT_CLIENT_ID` |
| `MICROSOFT_CLIENT_ID` | Required for MS login | Microsoft Entra ID application (client) ID. Must be paired with `MICROSOFT_TENANT_ID` |
| `MICROSOFT_CLIENT_SECRET` | Optional | Microsoft Entra ID app secret for MS Graph API integration |
| `CURRENT_URL_ORIGIN` | Optional | Public base origin (no trailing slash). Used for OAuth2 redirect callbacks, JWT `iss`, and `/.well-known/openid-configuration`. Defaults to `http://localhost:3000`; set to your real domain in production |
| `MICROSOFT_REDIRECT_URI` | Optional | Microsoft OAuth2 redirect URI path (must start with `/`). Defaults to `/api/oauth2/mscallback` |
| `REDIRECT_URI` | Optional | Onsite OAuth2 redirect URI path used by `/api/login`. Defaults to `/api/oauth2/dccallback`. The server auto-registers it for `ONSITE_LOGIN_CLIENT_ID` |
| `DEEPSEEK_API_KEY` | Optional | DeepSeek API key for AI chat features (debug routes only) |
| `PORT` / `HOST` | Optional | Server port/host override (defaults: `3000` / `0.0.0.0`) |
| `RATE_LIMIT_GENERAL_MAX` | Optional | General API rate limit, requests per minute (default: `60`) |
| `RATE_LIMIT_AUTH_MAX` | Optional | Authentication endpoint rate limit, attempts per minute (default: `10`) |
| `RATE_LIMIT_VOTE_MAX` | Optional | Voting/scoring endpoint rate limit, submissions per minute (default: `10`) |
| `RATE_LIMIT_UPLOAD_MAX` | Optional | File upload endpoint rate limit, uploads per minute (default: `10`) |
| `RATE_LIMIT_WINDOW_MS` | Optional | Rate limit window in milliseconds (default: `60000`) |
| `TRUST_PROXY` | Optional | Set to any truthy value when behind a trusted reverse proxy so `x-forwarded-for` is used for rate-limit client IP resolution |
| `DISABLE_DEBUG_ROUTES` | Optional | Set to any truthy value in production to disable `/api/debug/*` and `/debug` routes entirely |

> Note: `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, and `ONSITE_LOGIN_CLIENT_ID` were previously hardcoded in the `main` branch. They are now read from environment variables and must be set explicitly.

## Database Setup

The database auto-migrates on startup — no manual SQL is required. The init plugin `server/plugins/init-database.ts` calls `createDrizzleDatabase()` (in `server/database/index.ts`), which:

1. Selects the runtime's native SQLite driver (`bun:sqlite` under Bun, `better-sqlite3` under Node.js) via dynamic import
2. Applies `PRAGMA journal_mode = WAL` and `PRAGMA foreign_keys = ON`
3. Runs `createAndMigrateDatabase()` from `server/database/migrate.ts` to bring the schema up to date

All application queries use Drizzle ORM's parameterized query builders. User input is never interpolated into raw SQL strings, eliminating SQL injection risk. See `tests/api/sql-injection.test.ts` for regression coverage.

For manual schema management (e.g., generating migration files after editing `server/database/schema.ts`), Drizzle Kit is available:

```bash
bun run db:migrate    # apply pending Drizzle Kit migrations
bun run db:generate   # generate new migration from schema changes
bun run db:studio     # open Drizzle Studio
```

### Legacy databases

A database created on the `main` branch will be auto-repaired on first startup by `migrateLegacySchema()` in `server/database/migrate.ts`. No manual SQL needs to be run.

The legacy SQL schema and migration files that used to live in `sql/` have been **archived** under `sql/archive/`. They are kept for historical reference only and are not applied at runtime.

## Development

Start the dev server (port **24598**, configured in `nuxt.config.ts`):

```bash
bun dev
# or
npm run dev
```

The dev server defaults to HTTP. For HTTPS (required by some OAuth2 flows during local development), use `bun dev --https` or `npm run dev -- --https`.

> **Dependency pins in `package.json`:**
>
> - `vite` is pinned to `8.0.16`. Vite `8.1.x` combined with Nuxt `4.4.8` creates two HMR WebSocket listeners on the same HTTP server, crashing the dev server with `server.handleUpgrade() was called more than once with the same socket` ([nuxt/nuxt#35450](https://github.com/nuxt/nuxt/issues/35450)).
> - `entities` is pinned to `7.0.1`. `entities@8` changes the `entities/decode` export and breaks `@vue/compiler-core`'s entity decoder, causing errors such as `decode.fromCodePoint is not a function` when Vue parses SFC templates (e.g. `rules.vue`).
>
> Keep both overrides in place until the affected packages release compatible versions.

## Building

Build the production bundle (Nitro `node-server` preset):

```bash
bun run build
```

The same `.output/` artifact runs under both Bun and Node.js — the SQLite driver is selected at runtime based on `typeof Bun`.

## Testing

Tests are run with **Vitest**:

```bash
bun run test            # one-shot run
bun run test:watch      # watch mode
bun run test:coverage   # with coverage
```

Do **not** use `bun test`. Bun's native test runner cannot resolve Nuxt's `~~/` and `~/` path aliases (which are configured in `vitest.config.ts`), and the test files import their assertions from `vitest` rather than `bun:test`. Running `bun test` is intentionally redirected by `bunfig.toml` to a shim (`bun-shim/shim.test.ts`) that prints guidance pointing you to `bun run test`.

## Production

Two production start options are supported.

After a sucessful merge into main, you can do the following to create a commit build:

```bash
git checkout main
git pull origin main

git tag v<Specify Version> # MUST START WITH A "v" !!!

git push origin v<Specify Version>
```

### Bun (preferred)

```bash
bun start
```

This runs `start-fix.mjs`, which sets `globalThis._importMeta_` so the Nitro server's `import.meta.url` resolves correctly under Bun, then boots `.output/server/index.mjs`. **`start-fix.mjs` must be kept** — it is the Bun production entrypoint.

### Node.js

```bash
node .output/server/index.mjs
```

Set `NODE_ENV=production` and ensure all environment variables are present in the server environment before starting.

## Deployment

The application is deployed as a Node.js server on a VPS:

1. Build the production bundle on the server (or locally and sync `.output/`): `bun run build`
2. Ensure all required environment variables (see [Environment Setup](#environment-setup)) are set in the server environment
3. Start the server with `bun start` (Bun) or `node .output/server/index.mjs` (Node.js)
4. Put a reverse proxy (e.g., Nginx, Caddy) in front of the Node server for TLS termination and to forward traffic to the configured `PORT` (default `3000`)

The SQLite database file lives at `./database/basishacks.sqlite` and uses WAL mode. Back up the `database/` directory (including `-wal` and `-shm` files) for point-in-time snapshots.

### Production performance defaults

The following performance settings are configured in `nuxt.config.ts` and apply automatically to production builds:

- **Static asset compression**: `nitro.compressPublicAssets: true` pre-compresses public assets with gzip/brotli.
- **Long-lived cache headers**: `routeRules` set `Cache-Control: public, max-age=31536000, immutable` for `/_nuxt/**`, `/assets/**`, and `/fonts/**`.
- **Font display swap**: `@nuxt/fonts` is configured with `defaults.display: "swap"` and `preload: true` so the preloaded Monaspace Neon font renders with a fallback until it loads.
- **Build target**: `vite.build.target` is kept at `es2020` for stable compatibility across Node.js >= v24 and Bun.

These defaults can be adjusted in `nuxt.config.ts` if your deployment environment requires different caching or compression behavior.

## Project Structure

```
app/                    # Nuxt app (Vue frontend)
  assets/css/           # Global styles (Tailwind + custom utilities)
  components/           # Vue components
  layouts/              # Nuxt layouts
  middleware/           # Route middleware
  pages/                # File-based routing
  utils/                # Frontend utilities

server/                 # Nitro backend
  api/                  # API route handlers (file-based)
  middleware/           # Server middleware (security headers, OAuth2 authorize)
  plugins/              # Nitro plugins (DB init, MS Graph token, JWT secret guard)
  database/             # Drizzle ORM: schema, migrations, dual-runtime init
    schema.ts           # Drizzle schema definition
    migrate.ts          # createAndMigrateDatabase() + migrateLegacySchema()
    index.ts            # createDrizzleDatabase() — selects bun:sqlite or better-sqlite3
  utils/                # Server utilities
    database/           # Per-table Drizzle helpers
    auth.ts             # requireUser / requireJudge / requireAdmin / requirePermission
    convert.ts          # DB row -> public API object transformers
    rateLimit.ts        # In-memory rate limiter
    oauth2.ts           # Microsoft OAuth2 URL construction
    oauth2-validate.ts  # OAuth2 authorization request validation
    oauth2-jwt.ts       # JWT verification and withOAuth2JWT() wrapper
    profile.ts          # Profile picture helpers
    assets.ts           # Static and user asset helpers
    scoring.ts          # Score aggregation and final ranking
    url-validation.ts   # Redirect URI validation
    validate-oauth2-jwt-secret.ts # JWT secret guard
    deepseek-store.ts   # DeepSeek AI chat session store
  types/                # Type augmentations (H3EventContext)

shared/                 # Code shared between client and server
  schemas.ts            # Zod validation schemas
  database.d.ts         # DB TypeScript types
  responses.d.ts        # API response interface definitions
  auth.d.ts             # nuxt-auth-utils session type augmentation
  permissions.ts        # Fine-grained permission constants and helpers
  oauth2-scopes.ts      # OAuth2 scope definitions
  oauth2.ts             # Microsoft OAuth2 static configuration
  rubric.ts             # Judging rubric definitions
  awards.ts             # Award registry definitions
  seasons.ts            # Static season metadata

sql/archive/            # ARCHIVED legacy SQL schema and migrations (not active)
  init.sql              # Historical base schema
  migration-*.sql       # Historical dated migrations
  patch-*.sql           # Historical feature patches

database/               # Local SQLite file (basishacks.sqlite, WAL mode)

drizzle/                # Drizzle Kit generated migration files

tests/                  # Vitest test suite (server, api, shared, frontend, etc.)
  setup.ts              # Vitest setupFile

documentation/          # VitePress documentation site
  .vitepress/config.ts  # Sidebar / nav config

start-fix.mjs           # Bun production start entrypoint (kept intentionally)
bunfig.toml             # Redirects `bun test` to a guidance shim
bun-shim/shim.test.ts   # Shim that prints "use bun run test" guidance
```

## Migration from main

The `enhance-and-debloat` branch merges cleanly with `origin/main` (only one new commit on main: `129c1ca Update .gitignore`). The steps below cover both fresh setups and upgrades from an existing `main` deployment.

### Fresh clone

```bash
git checkout enhance-and-debloat
bun install
cp .env.example .env       # then edit .env and fill in credentials
bun run build
bun run test
bun start                  # or: node .output/server/index.mjs
```

### Existing database (upgrade from main)

No manual SQL is required. On first startup against an existing `main`-era database:

1. `migrateLegacySchema()` in `server/database/migrate.ts` detects the legacy schema and applies the necessary repairs
2. `createAndMigrateDatabase()` brings the schema up to date via Drizzle
3. The server boots normally

Back up the `database/` directory before the first boot as a precaution.

### New required environment variables

The following variables were hardcoded on `main` and **must now be set explicitly** in `.env` (or the server environment):

- `MICROSOFT_TENANT_ID` — previously hardcoded Microsoft Entra tenant ID
- `MICROSOFT_CLIENT_ID` — previously hardcoded Microsoft Entra client ID
- `ONSITE_LOGIN_CLIENT_ID` — previously hardcoded OAuth2 client_id for the onsite login flow

Without these, Microsoft OAuth2 login and the onsite login flow will not function.

### Conflict-free merge

Merging `origin/main` into `enhance-and-debloat` (or vice versa) produces no conflicts. The only incoming change from `main` is `.gitignore`, which applies cleanly.

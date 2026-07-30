# basishacks

The official website for the **BIBS-C Network Hackathon** (season 2, 2025–26). Full-stack Nuxt 4 application with OAuth2 authorization server, peer voting, judge scoring, team management, and Microsoft Graph API integration.

## Technology Stack

| Layer           | Technology                                             |
| --------------- | ------------------------------------------------------ |
| Framework       | Nuxt 4                                                 |
| UI              | @nuxt/ui (Tailwind CSS v4)                             |
| Language        | TypeScript                                             |
| Runtime         | Node.js >= v24 or Bun                                  |
| Package Manager | Bun (preferred); npm works                             |
| Database        | SQLite via Drizzle ORM (bun:sqlite / better-sqlite3)   |
| Auth            | nuxt-auth-utils (session-based)                        |
| JWT             | jose (OAuth2 access tokens)                            |
| Validation      | Zod 4.x                                                |
| Fonts           | @nuxt/fonts (local provider)                           |
| Icons           | @iconify-json (lucide, material-symbols, simple-icons) |
| Linting         | @nuxt/eslint + Prettier                                |

## Prerequisites

- **Node.js** >= v24, **or** **Bun** (any recent 1.x release)
- Bun is the preferred runtime and package manager; npm works as a fallback
- A SQLite-compatible filesystem (the local DB file lives at `./database/basishacks.sqlite`)

## Installation

```bash
bun install
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
| `RATE_LIMIT_GENERAL_MAX` | Optional | General API rate limit, requests per minute (default: `6000`) |
| `RATE_LIMIT_AUTH_MAX` | Optional | Authentication endpoint rate limit, attempts per minute (default: `600`) |
| `RATE_LIMIT_VOTE_MAX` | Optional | Voting/scoring endpoint rate limit, submissions per minute (default: `600`) |
| `RATE_LIMIT_UPLOAD_MAX` | Optional | File upload endpoint rate limit, uploads per minute (default: `600`) |
| `RATE_LIMIT_WINDOW_MS` | Optional | Rate limit window in milliseconds (default: `60000`) |
| `TRUST_PROXY` | Optional | Set to any truthy value when behind a trusted reverse proxy so `x-forwarded-for` is used for rate-limit client IP resolution |
| `DISABLE_DEBUG_ROUTES` | Optional | Set to any truthy value in production to disable `/api/debug/*` and `/debug` routes entirely |

> Note: `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, and `ONSITE_LOGIN_CLIENT_ID` were previously hardcoded in the `main` branch. They are now read from environment variables and must be set explicitly.

## Authentication

The only login method for the hackathon registry is **Microsoft OAuth2**. Users authenticate through Microsoft Entra ID (configured via `MICROSOFT_TENANT_ID` and `MICROSOFT_CLIENT_ID`), and the application creates or updates the local user record from the Microsoft profile.

The legacy email-verification-code login flow has been removed, and the `login_code` / `login_expiry` columns no longer exist in the `users` table.

The `/api/login` endpoint initiates the **basishacks connect** onsite OAuth2 flow (`/api/login` → `/api/oauth2/authorize` → Microsoft) for the first-party application identified by `ONSITE_LOGIN_CLIENT_ID`.

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

```bash
bun dev --https        # HTTPS on port 24598
npm run dev -- --https # or with npm
```

For HTTP (not recommended — OAuth2 requires secure context): `bun dev`

## Testing

```bash
bun run test            # full suite (also generates tests/.test-meta.json)
bun run test:watch      # watch mode
bun run test:coverage   # with coverage
```

The canonical test count is stored in `tests/.test-meta.json` and displayed dynamically in the VitePress documentation.

Do **not** use `bun test` — it cannot resolve Nuxt path aliases. `bunfig.toml` redirects it to a guidance shim.

## Building & Production

```bash
bun run build                        # Nitro node-server preset
bun start                            # Bun runtime
node .output/server/index.mjs        # Node.js runtime
```

The same `.output/` artifact runs under both runtimes — the SQLite driver is selected at startup.

Place a reverse proxy (Nginx, Caddy) in front for TLS termination. The SQLite database lives at `./database/basishacks.sqlite` (WAL mode).

## Deployment

1. Build on the server: `bun run build`
2. Set all required environment variables in the server environment
3. Start with `bun start` (Bun) or `node .output/server/index.mjs` (Node.js)
4. Reverse proxy with TLS in front (port defaults to `3000`)

## Project Structure

```
app/                    # Vue frontend
server/                 # Nitro backend
  api/                  # API route handlers
  middleware/           # Security headers, OAuth2 authorize, debug lockdown
  plugins/              # DB init, MS Graph token, env validation
  database/             # Drizzle ORM schema + dual-runtime init
  utils/                # Auth, rate limiting, OAuth2 JWT, URL validation, etc.
shared/                 # Zod schemas, types, permissions, OAuth2 scopes, rubric
tests/                  # Vitest suite
documentation/          # VitePress site
```

## Migration from main

### Fresh clone

```bash
git checkout enhance-and-debloat
bun install
cp .env.example .env       # then edit .env
bun run build
bun run test
bun start
```

### Existing database (upgrade)

No manual SQL is required — `migrateLegacySchema()` auto-repairs legacy databases on first startup.

### New required env vars

`MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, and `ONSITE_LOGIN_CLIENT_ID` were previously hardcoded and **must now be set explicitly** in `.env`.

# basishacks

The official website for the **BIBS-C Network Hackathon** (season 2, 2025–26). Full-stack Nuxt 4 application with basis-auth login, peer voting, judge scoring, team management, and independent Graph integration.

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
| OIDC            | openid-client + jose                                   |
| Validation      | Zod 4.x                                                |
| Fonts           | @nuxt/fonts (local provider)                           |
| Icons           | @iconify-json (lucide, material-symbols, simple-icons) |
| Linting         | @nuxt/eslint + Prettier                                |
| Animation       | GSAP with ScrollTrigger (showcase pages)               |

## Season Showcases

The public `/showcase` page collects the season showcases in one place. The current featured experience, Beneath the Surface, lives at `/showcase/beneath-the-surface`; the previous Signal experience lives at `/showcase/signal`. Beneath the Surface loads archived project metadata from `/api/teams?season_id=1` and presents the top three Junior and top three Senior projects as six full-screen, project-specific chapters. GSAP and ScrollTrigger provide the desktop scroll choreography, while mobile and reduced-motion visitors receive a natural, non-pinned reading experience.

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
| `BASIS_AUTH_ISSUER` | Required | Exact basis-auth issuer URL used for discovery and token validation |
| `BASIS_AUTH_CLIENT_ID` | Required | Confidential client ID registered for basishacks |
| `BASIS_AUTH_CLIENT_SECRET` | Required | Confidential client secret; keep it server-side |
| `BASIS_AUTH_RESOURCE` | Required | Resource audience for basishacks access tokens (normally `urn:basis:api:basishacks`) |
| `MICROSOFT_TENANT_ID` | Optional | Tenant used only by Graph features |
| `MICROSOFT_CLIENT_ID` | Optional | Application ID used only by Graph features |
| `MICROSOFT_CLIENT_SECRET` | Optional | Application secret used only by Graph features |
| `CURRENT_URL_ORIGIN` | Optional | Public origin used to derive `/api/auth/basis/callback`. Defaults to `http://localhost:3000`; set it to the externally reachable origin in production |
| `DEEPSEEK_API_KEY` | Optional | DeepSeek API key for AI chat features (debug routes only) |
| `PORT` / `HOST` | Optional | Server port/host override (defaults: `3000` / `0.0.0.0`) |
| `RATE_LIMIT_GENERAL_MAX` | Optional | General API rate limit, requests per minute (default: `6000`) |
| `RATE_LIMIT_AUTH_MAX` | Optional | Authentication endpoint rate limit, attempts per minute (default: `600`) |
| `RATE_LIMIT_VOTE_MAX` | Optional | Voting/scoring endpoint rate limit, submissions per minute (default: `600`) |
| `RATE_LIMIT_UPLOAD_MAX` | Optional | File upload endpoint rate limit, uploads per minute (default: `600`) |
| `RATE_LIMIT_WINDOW_MS` | Optional | Rate limit window in milliseconds (default: `60000`) |
| `TRUST_PROXY` | Optional | Set to any truthy value when behind a trusted reverse proxy so `x-forwarded-for` is used for rate-limit client IP resolution |
| `DISABLE_DEBUG_ROUTES` | Optional | Set to any truthy value in production to disable `/api/debug/*` and `/debug` routes entirely |

## Authentication

The only login method is the separately deployed **basis-auth** service. `/api/login` discovers the issuer and starts an authorization-code flow with S256 PKCE, state, and nonce. The callback URL is always `${CURRENT_URL_ORIGIN}/api/auth/basis/callback`; it must be registered exactly for each environment.

The short-lived login transaction is stored in a separate encrypted HTTP-only session. After the callback validates the ID token and loads UserInfo, basishacks links the first verified login to the existing local user by normalized email. Later logins resolve by the stable issuer and subject, preserving local user IDs, roles, teams, votes, and submissions. Provider tokens are not stored. Logout remains local to basishacks.

The former basishacks OAuth provider and application-management UI/API have been retired. The legacy `oauth2_applications` table and records remain for audit and rollback. Graph integration is independent and is never used to authenticate a basishacks session.

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

The same `.output/` artifact runs under both runtimes — the SQLite driver is selected at startup. Nitro leaves runtime dependencies external, so deploy the artifact together with the production `node_modules` directory.

Place a reverse proxy (Nginx, Caddy) in front for TLS termination. The SQLite database lives at `./database/basishacks.sqlite` (WAL mode).

## Deployment

1. Build on the server: `bun run build`
2. Set all required environment variables in the server environment
3. Start with `bun start` (Bun) or `node .output/server/index.mjs` (Node.js)
4. Reverse proxy with TLS in front (port defaults to `3000`)

### GitHub tag releases

Pushing a tag beginning with `v` runs `.github/workflows/release.yml`. It builds a self-contained Bun production artifact and attaches `production-<version>-<commit>-linux-amd64-bun.tar.gz` to the corresponding GitHub release. Extract the archive on the target host, provide the required environment variables, and start the server from the directory containing `.output/`. Create a writable `database/` directory beside `.output/` first; it holds the SQLite database and is intentionally not included in the release artifact.

## Project Structure

```
app/                    # Vue frontend
server/                 # Nitro backend
  api/                  # API route handlers
  middleware/           # Security headers, OAuth2 authorize, debug lockdown
  plugins/              # DB initialization, Graph integration, env validation
  database/             # Drizzle ORM schema + dual-runtime init
  utils/                # Auth, rate limiting, OAuth2 JWT, URL validation, etc.
shared/                 # Zod schemas, types, permissions, OAuth2 scopes, rubric
tests/                  # Vitest suite
documentation/          # VitePress site
```

## Migration from main

### Fresh clone

```bash
git checkout codex/basis-auth-login
bun install
cp .env.example .env       # then edit .env
bun run build
bun run test
bun start
```

### Existing database (upgrade)

No manual SQL is required — `migrateLegacySchema()` auto-repairs legacy databases on first startup.

### Required authentication env vars

Set `BASIS_AUTH_ISSUER`, `BASIS_AUTH_CLIENT_ID`, `BASIS_AUTH_CLIENT_SECRET`, and `BASIS_AUTH_RESOURCE` in `.env`. Register `${CURRENT_URL_ORIGIN}/api/auth/basis/callback` with the same basis-auth client.

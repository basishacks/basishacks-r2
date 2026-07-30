# AGENTS.md — basishacks

This file contains project-specific context for AI coding agents. The reader is assumed to know nothing about the codebase.

---

## Project Overview

`basishacks` is the official website for the BIBS-C Network Hackathon (season 2, 2025–26). It is a full-stack Nuxt 4 application that manages:

- Hackathon registration and scheduling
- Team creation and management
- Project submission (name, description, demo URL, repo URL)
- Peer voting and judge scoring
- OAuth2 application integrations

The stack is Vue 3 (frontend) + Nitro (backend) + SQLite via Drizzle ORM (`bun:sqlite` under Bun, `better-sqlite3` under Node.js).

---

## Technology Stack

| Layer | Technology |
| --- | --- |
| Framework | Nuxt 4 (^4.4.8) |
| UI | `@nuxt/ui` ^4.9.0 (Tailwind CSS v4 based) |
| Language | TypeScript (^5.9.3) |
| Runtime | Node.js >= v24 or Bun (dual-runtime support) |
| Package Manager | Bun (preferred); npm works |
| Database | SQLite via Drizzle ORM (`bun:sqlite` under Bun, `better-sqlite3` under Node.js) |
| Auth | `nuxt-auth-utils` 0.5.25 (session-based) |
| Validation | Zod 4.x (^4.4.3) |
| Fonts | `@nuxt/fonts` ^0.14.0 (local provider) |
| Icons | `@iconify-json/lucide`, `@iconify-json/material-symbols` |
| Linting | `@nuxt/eslint` 1.10.0 + Prettier ^3.9.4 |
| Deployment | Node.js server (VPS; Bun also supported) |

---

## Directory Structure

```
app/                # Nuxt app (Vue frontend)
  assets/css/       # Global styles (Tailwind + custom utilities)
  components/       # Vue components
  layouts/          # Nuxt layouts (default, dashboard, fullwidth, etc.)
  middleware/       # Route middleware (auth.ts)
  pages/            # File-based routing
  utils/            # Frontend utilities (consts, errors, loading)

server/             # Nitro backend
  api/              # API route handlers (file-based)
  middleware/       # Server middleware (OAuth2 authorize)
  plugins/          # Nitro plugins (DB init, MS Graph token init)
  database/         # Drizzle ORM schema, migrations, and runtime-agnostic init
    schema.ts       # Canonical Drizzle schema
    migrate.ts      # Custom migration runner + legacy schema repair
    index.ts        # createDrizzleDatabase() selects bun:sqlite or better-sqlite3
  types/            # Type augmentations (H3EventContext)
  utils/            # Server utilities
    database/       # Per-table Drizzle helpers
    auth.ts         # requireUser / requireJudge / requireAdmin
    convert.ts      # DB row -> public API object transformers
    rateLimit.ts    # In-memory rate limiter
    oauth2.ts       # OAuth2 logic
    profile.ts      # Profile picture helpers
    assets.ts       # Asset helpers
    deepseek-store.ts

shared/             # Code shared between client and server
  schemas.ts        # Zod schemas for API input validation
  database.d.ts     # TypeScript types matching DB schema exactly
  responses.d.ts    # API response interface definitions
  auth.d.ts         # nuxt-auth-utils session type augmentation
  oauth2.ts         # Microsoft OAuth2 static config
  rubric.ts         # Judging rubric definitions

sql/archive/        # Archived legacy SQL schema and migrations
  init.sql          # Historical base schema
  migration-*.sql   # Historical dated migrations
  patch-*.sql       # Historical feature patches

drizzle/            # Drizzle Kit generated migration files
  *.sql             # Migration SQL
  meta/             # Drizzle Kit metadata snapshots

tests/              # Vitest test suite
  **/*.test.ts      # API, server utility, shared, component, page, etc.
  setup.ts          # Global test setup, in-memory DB, mocks

bun-shim/           # Compatibility shim for `bun test`
  shim.test.ts      # Prints guidance to use `bun run test`

database/           # SQLite database file (basishacks.sqlite, WAL mode)
```

---

## Build & Development Commands

```bash
# Install dependencies
bun i

# Database auto-migrates on server startup; manual Drizzle Kit command
bun run db:migrate

# Dev server (HTTPS, port 24598)
bun dev --https
# or
npm run dev -- --https

# Production build
bun run build

# Preview built app
bun run preview   # port 24598

# Run tests (Vitest; do NOT use `bun test`)
bun run test
```

---

## Runtime Architecture

### Local Development

- Nitro preset: `node-server`
- SQLite driver is selected at runtime: `bun:sqlite` under Bun, `better-sqlite3` under Node.js
- Database file: `./database/basishacks.sqlite` with WAL mode and foreign keys enabled
- `server/plugins/init-database.ts` initializes the DB on startup via Drizzle ORM and attaches it to `event.context.drizzle`

### Production (VPS)

- Nitro preset: `node-server`
- Same runtime-agnostic SQLite driver selection as local development
- Database file: `./database/basishacks.sqlite` with WAL mode and foreign keys enabled
- The same `event.context.drizzle` is used as in local development

---

## Auth & Roles

Two auth methods are supported:

1. **Microsoft OAuth2** — delegates to Microsoft Entra ID (tenant configured via `MICROSOFT_TENANT_ID`). This is the only login method for the hackathon registry.
2. **basishacks connect** — custom OAuth2 integration.

Session storage is handled by `nuxt-auth-utils`. The session cookie stores only `{ user: { id: number } }`.

Roles:

- `participant`
- `judge`
- `admin`

Use the helpers in `server/utils/auth.ts` to enforce roles:

- `requireUser(event)` — returns the full DB user row or 401
- `requireJudge(event)` — 403 if not judge/admin
- `requireAdmin(event)` — 403 if not admin

---

## Database Conventions

- All DB access goes through `event.context.drizzle` (Drizzle ORM).
- Per-table helpers live in `server/utils/database/*.ts` (e.g., `users.ts`, `teams.ts`).
- The canonical TypeScript types are in `shared/database.d.ts` (inferred from Drizzle schema).
- Migration files are generated by Drizzle Kit and stored in `drizzle/`; they are applied automatically on server startup by the runtime-agnostic runner in `server/database/migrate.ts`.
- Profile themes are stored as `"mode|value"` strings in the DB and parsed into `{ mode, value }` objects in the API layer (`server/utils/convert.ts`).

---

## API Patterns

- Route files use Nuxt/Nitro file-based naming: `server/api/teams/index.post.ts`.
- Input validation is mandatory; use `readValidatedBody(event, Schema.parse)` or `getValidatedQuery(event, Schema.parse)`.
- Shared Zod schemas are in `shared/schemas.ts`.
- API responses should match the interfaces in `shared/responses.d.ts`.
- Use `convertUserToPublic` and `convertTeamToPublic` to strip internal fields before returning data.
- Rate limiting is applied with `applyRateLimit(handler)` from `server/utils/rateLimit.ts` (default: 60 requests/minute). See `RATE_LIMITING.md` for usage.

---

## Frontend Patterns

- Pages use `<script setup lang="ts">`.
- Global constants (`WEBSITE_NAME`, `THEME_NAME`) are imported from `~/utils/consts.ts`.
- Fetch errors are handled with `getErrorMessage(e)` from `~/utils/errors.ts`.
- The `auth` route middleware (`app/middleware/auth.ts`) redirects unauthenticated users to `/login`.
- Layouts are declared with `definePageMeta({ layout: '...' })`.
- UI components come from `@nuxt/ui` (e.g., `UButton`, `UForm`, `UAlert`).
- Run `bun run format` always before you commit

---

## Code Style

- Prettier config (`.prettierrc`): **semicolons enabled**, **double quotes**, `tabWidth: 4`, `trailingComma: all`, `printWidth: 100`.
- ESLint is configured via `@nuxt/eslint` (`eslint.config.mjs`).
- Prefer `const` and arrow functions where appropriate.
- Use `~~/` for imports from the project root (especially in server code).

---

## Testing

Tests are run with **Vitest**:

```bash
bun run test            # one-shot run
bun run test:watch      # watch mode
bun run test:coverage   # with coverage
```

The suite currently contains **647 passing tests** covering API endpoints, server utilities, database helpers, shared schemas, frontend components, pages, composables, and middleware.

Do **not** use `bun test`. Bun's native test runner cannot resolve Nuxt's `~~/` and `~/` path aliases. `bunfig.toml` redirects `bun test` to `bun-shim/shim.test.ts`, which prints guidance pointing to `bun run test`.

Legacy files such as `tests/index.js`, `tests/test.oauth2.js`, `tests/test.microsoft.ts`, and `tests/test.deepseek.ts` are kept for reference but are not part of the active Vitest suite.

---

## Security Considerations

- **Rate limiting** is in-memory and per-process. Under high concurrency or with multiple server instances, consider using a shared store (e.g., Redis).
- **Session password** (`NUXT_SESSION_PASSWORD`) must be at least 32 bytes.
- **Foreign keys** are enforced (`PRAGMA foreign_keys = ON`).
- **Input validation** is performed with Zod on every API endpoint.
- **RBAC** is enforced server-side; never trust the frontend for permission checks.
- **MS Graph API** calls are centralized in `server/plugins/microsoft.ts` for auditability.

---

## Deployment

The application is deployed as a Node.js server on a VPS:

```bash
# Build for production
bun run build

# Start the server
node .output/server/index.mjs
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in at least the required values:

### Required

| Variable | Purpose |
| --- | --- |
| `NUXT_SESSION_PASSWORD` | Session encryption key (>= 32 bytes) |
| `NUXT_OAUTH2_JWT_SECRET` | JWT signing secret for OAuth2 token exchange (>= 32 bytes). Validated at startup. |
| `ONSITE_LOGIN_CLIENT_ID` | OAuth2 `client_id` of the basishacks app used for the onsite login flow |

### Optional (for Microsoft features)

| Variable | Purpose |
| --- | --- |
| `MICROSOFT_TENANT_ID` | Microsoft Entra ID tenant ID |
| `MICROSOFT_CLIENT_ID` | Microsoft Entra ID application (client) ID |
| `MICROSOFT_CLIENT_SECRET` | Microsoft Entra ID client secret for Graph API |
| `MICROSOFT_REDIRECT_URI` | Microsoft OAuth2 redirect URI path (default `/api/oauth2/mscallback`) |

### Optional (for development)

| Variable | Purpose |
| --- | --- |
| `CURRENT_URL_ORIGIN` | Public base origin for OAuth2 callbacks, JWT `iss`, and OpenID Discovery (default `http://localhost:3000`) |
| `REDIRECT_URI` | Onsite OAuth2 redirect path (default `/api/oauth2/dccallback`) |
| `DEEPSEEK_API_KEY` | DeepSeek API key for AI chat features |
| `PORT` / `HOST` | Server port/host override (defaults: `3000` / `0.0.0.0`) |
| `MICROSOFT_DUMMY_USER_NAME` | ROPC test user (rarely used) |
| `MICROSOFT_DUMMY_USER_PASSWORD` | ROPC test password (rarely used) |

In production, these are configured in the server environment.

---

## Useful Notes

- The `hackathon` table has a single row (`id = 1`) that controls the global event state (`not_started`, `in_progress`, `voting`, `finished`, `paused`).
- Team project submissions are only accepted while the hackathon status is `not_started` or `in_progress`.
- Peer voting scores must sum to exactly 10.
- Judge scoring uses rubric criteria defined in `shared/rubric.ts` with scores 0–5 per criterion.
- The `/api/debug/*` routes expose DeepSeek chat sessions and file upload utilities; these are intended for development only.

---

## Documentation Maintenance

**This is a mandatory step.** Before ending every request or finalizing any plan or whenever possible, you MUST:

1. **Update `README.md`** — If your changes affect any feature, configuration, command, or behavior described in the README, update the relevant sections to reflect the current state of the project.

2. **Update VitePress documentation whenever you apply a change (whenever possible)** — If your changes affect any area documented in the `documentation/` directory, update the corresponding pages:
    - `documentation/guide/` — Getting started, project overview, environment setup
    - `documentation/architecture/` — Overview, runtime, database, auth, OAuth2
    - `documentation/frontend/` — Components, pages, layouts, composables
    - `documentation/backend/` — API reference, server utilities, plugins & middleware
    - `documentation/shared/` — Schemas, types, rubric, permissions, OAuth2 scopes
    - `documentation/deployment/` — Deployment, security, rate limiting

    If no existing page covers the changed area, add a new page and register it in `documentation/.vitepress/config.ts` sidebar.

3. **Verify the documentation builds** — Run `cd documentation && npm run build` to confirm no broken links or build errors.

Do not mark a task as complete until the above steps are done.

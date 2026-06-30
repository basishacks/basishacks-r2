# AGENTS.md — basishacks

This file contains project-specific context for AI coding agents. The reader is assumed to know nothing about the codebase.

---

## Project Overview

`basishacks` is the official website for the BIBS-C Network Hackathon (season 2, 2025–26). It is a full-stack Nuxt 3 application that manages:

- Hackathon registration and scheduling
- Team creation and management
- Project submission (name, description, demo URL, repo URL)
- Peer voting and judge scoring
- OAuth2 application integrations

The stack is Vue 3 (frontend) + Nitro (backend) + SQLite (better-sqlite3).

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Nuxt 3 (latest) |
| UI | `@nuxt/ui` ^4.6.1 (Tailwind CSS v4 based) |
| Language | TypeScript 5.6+ |
| Runtime | Node.js >= v24 |
| Package Manager | Bun (preferred); npm works |
| Database (local) | `better-sqlite3` with WAL mode |
| Database (prod) | SQLite (better-sqlite3) |
| Auth | `nuxt-auth-utils` (session-based) |
| Validation | Zod 4.x |
| Fonts | `@nuxt/fonts` (local provider) |
| Icons | `@iconify-json/lucide`, `@iconify-json/material-symbols` |
| Linting | `@nuxt/eslint` + Prettier |
| Deployment | Node.js server (VPS) |

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
  types/            # Type augmentations (H3EventContext)
  utils/            # Server utilities
    database/       # Drizzle ORM schema and init
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

sql/                # Schema and migrations
  init.sql          # Base schema (hackathon, teams, users, ballots, etc.)
  migration-*.sql   # Dated migrations
  patch-*.sql       # Feature patches

tests/              # Test suite
  index.js          # Test runner entry
  test.oauth2.js    # OAuth2 tests
  test.microsoft.ts # MS Graph API tests (mostly commented out)
  test.deepseek.ts  # DeepSeek API tests

database/           # Local SQLite file (basishacks.sqlite)
```

---

## Build & Development Commands

```bash
# Install dependencies
bun i

# Initialize local database (run once)
bun run db:migrate

# Dev server (HTTPS, port 24598)
bun dev --https
# or
npm run dev -- --https

# Production build
bun run build

# Preview built app
bun run preview   # port 24598

# Run tests
bun test
```

---

## Runtime Architecture

### Local Development
- Nitro preset: `node-server`
- Uses `better-sqlite3` directly against `./database/basishacks.sqlite`
- `server/plugins/init-database.ts` initializes the DB on startup via Drizzle ORM and attaches it to `event.context.drizzle`

### Production (VPS)
- Nitro preset: `node-server`
- Uses `better-sqlite3` directly against `./database/basishacks.sqlite`
- The same `event.context.drizzle` is used as in local development

---

## Auth & Roles

Three auth methods are supported:

1. **Magic code** — user enters `@basischina.com` email, receives a 6-digit code (10-minute expiry), and exchanges it for a session.
2. **Microsoft OAuth2** — delegates to Microsoft Entra ID (tenant `cbc6e1e2-a6bb-4002-bbdc-6da892a051a7`).
3. **basishacks connect** — custom OAuth2 integration.

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
- Migrations are managed via Drizzle Kit (`drizzle/` directory).
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

---

## Code Style

- Prettier config (`.prettierrc`): **no semicolons**, **single quotes**.
- ESLint is configured via `@nuxt/eslint` (`eslint.config.mjs`).
- Prefer `const` and arrow functions where appropriate.
- Use `~~/` for imports from the project root (especially in server code).

---

## Testing

Tests are run with `node --env-file=.env tests/index.js`. The runner imports and executes:
- `test.oauth2.js`
- `test.microsoft.ts` (mostly commented out; requires admin-approved MS Graph permissions)
- `test.deepseek.ts`

There is no framework like Vitest or Jest; tests are simple async functions that return `true`/`false`.

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

Copy `.env.example` to `.env` and fill in:

| Variable | Purpose |
|----------|---------|
| `NUXT_SESSION_PASSWORD` | Session encryption key (>= 32 bytes) |
| `NUXT_SEND_CODE_URL` | External webhook/service URL for sending login codes |
| `MICROSOFT_CLIENT_SECRET` | MS Entra app secret for Graph API |
| `MICROSOFT_DUMMY_USER_NAME` | ROPC test user (rarely used) |
| `MICROSOFT_DUMMY_USER_PASSWORD` | ROPC test password (rarely used) |

In production, these are configured in the server environment.

---

## Useful Notes

- The `hackathon` table has a single row (`id = 1`) that controls the global event state (`not_started`, `in_progress`, `voting`, `finished`, `paused`).
- Team project submissions are only accepted while the hackathon status is `not_started` or `in_progress`.
- Peer voting scores must sum to exactly 12.
- Judge scoring uses rubric criteria defined in `shared/rubric.ts` with scores 0–5 per criterion.
- The `/api/debug/*` routes expose DeepSeek chat sessions and file upload utilities; these are intended for development only.

---

## Documentation Maintenance

**This is a mandatory step.** Before ending every request or finalizing any plan, you MUST:

1. **Update `README.md`** — If your changes affect any feature, configuration, command, or behavior described in the README, update the relevant sections to reflect the current state of the project.

2. **Update VitePress documentation** — If your changes affect any area documented in the `documentation/` directory, update the corresponding pages:
   - `documentation/guide/` — Getting started, project overview, environment setup
   - `documentation/architecture/` — Overview, runtime, database, auth, OAuth2
   - `documentation/frontend/` — Components, pages, layouts, composables
   - `documentation/backend/` — API reference, server utilities, plugins & middleware
   - `documentation/shared/` — Schemas, types, rubric, permissions, OAuth2 scopes
   - `documentation/deployment/` — Deployment, security, rate limiting

   If no existing page covers the changed area, add a new page and register it in `documentation/.vitepress/config.ts` sidebar.

3. **Verify the documentation builds** — Run `cd documentation && npm run build` to confirm no broken links or build errors.

Do not mark a task as complete until the above steps are done.

---
title: Architecture Overview
description: High-level overview of the basishacks full-stack architecture, directory structure, data flow, and key design decisions.
---

# Architecture Overview

basishacks is a **full-stack Nuxt 3 application** that combines a Vue 3 frontend with a Nitro backend in a single deployable unit. It manages hackathon registration, team creation, project submission, peer voting, and judge scoring for the BIBS-C Network Hackathon (season 2, 2025–26).

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Nuxt 3 (latest) |
| UI | `@nuxt/ui` ^4.6.1 (Tailwind CSS v4 based) |
| Language | TypeScript 5.6+ |
| Runtime | Node.js >= v24 |
| Package Manager | Bun (preferred); npm works |
| Database (local) | `better-sqlite3` with WAL mode |
| Database (prod) | Cloudflare D1 (binding name `DB`) |
| Auth | `nuxt-auth-utils` (session-based) |
| Validation | Zod 4.x |
| Fonts | `@nuxt/fonts` (local provider) |
| Icons | `@iconify-json/lucide`, `@iconify-json/material-symbols` |
| Linting | `@nuxt/eslint` + Prettier |
| Deployment | Cloudflare Pages via GitHub Actions |

## Directory Structure

```
basishacks-r2/
├── app/                    # Nuxt app (Vue frontend)
│   ├── assets/css/         # Global styles (Tailwind + custom utilities)
│   ├── components/         # Vue components
│   ├── layouts/            # Nuxt layouts (default, dashboard, fullwidth)
│   ├── middleware/          # Route middleware (auth.ts)
│   ├── pages/              # File-based routing
│   └── utils/              # Frontend utilities (consts, errors, loading)
├── server/                 # Nitro backend
│   ├── api/                # API route handlers (file-based)
│   ├── middleware/          # Server middleware (OAuth2 authorize)
│   ├── plugins/            # Nitro plugins (DB init, MS Graph token)
│   ├── types/              # Type augmentations (H3EventContext, Cloudflare)
│   └── utils/              # Server utilities
│       ├── database.ts     # SQLite wrapper mimicking D1 interface
│       ├── database/       # Per-table DB helpers (users, teams, scores, etc.)
│       ├── auth.ts         # requireUser / requireJudge / requireAdmin
│       ├── convert.ts      # DB row -> public API object transformers
│       ├── rateLimit.ts    # In-memory rate limiter
│       ├── oauth2.ts       # Microsoft OAuth2 config
│       ├── oauth2-validate.ts  # OAuth2 authorization request validation
│       ├── oauth2-jwt.ts   # JWT verification and withOAuth2JWT() wrapper
│       └── profile.ts      # Profile picture helpers
├── shared/                 # Code shared between client and server
│   ├── schemas.ts          # Zod schemas for API input validation
│   ├── database.d.ts       # TypeScript types matching DB schema exactly
│   ├── responses.d.ts      # API response interface definitions
│   ├── auth.d.ts           # nuxt-auth-utils session type augmentation
│   ├── permissions.ts      # Fine-grained permission constants and helpers
│   ├── oauth2-scopes.ts    # OAuth2 scope definitions
│   └── rubric.ts           # Judging rubric definitions
├── sql/                    # Schema and migrations
│   ├── init.sql            # Base schema
│   └── migration-*.sql     # Dated migrations
├── documentation/          # VitePress documentation
└── tests/                  # Test suite
```

## Data Flow

The request lifecycle follows a clear path through the Nuxt/Nitro stack:

```
Client (Browser)
  │
  ▼
Nuxt Middleware (auth.ts route guard)
  │
  ▼
Nitro Server Middleware (OAuth2 authorize, rate limiting)
  │
  ▼
Nitro API Handler (server/api/**/*.ts)
  │  ├── Input validation via Zod schemas
  │  ├── Role/permission checks via requireUser/requireAdmin/etc.
  │  └── Database access via event.context.db
  │
  ▼
SQLite (local) / Cloudflare D1 (production)
  │
  ▼
Response (JSON, converted via convertUserToPublic/convertTeamToPublic)
```

### Request context

Every incoming request has the following context attached by plugins and middleware:

| Context Key | Type | Set By | Purpose |
|-------------|------|--------|---------|
| `event.context.db` | `SQLiteDatabase` | `init-database.ts` plugin | Database access |
| `event.context.cf` | `CfProperties` | Cloudflare runtime | Cloudflare-specific properties |
| `event.context.oauth2` | `OAuth2JWTContext` | `withOAuth2JWT()` wrapper | OAuth2 JWT payload, scopes, user |

## Key Architectural Decisions

### File-based routing

Both frontend pages and backend API routes use Nuxt/Nitro file-based naming conventions. This eliminates the need for a separate router configuration and keeps the codebase organized by feature.

- Frontend: `app/pages/dashboard/teams.vue` → `/dashboard/teams`
- Backend: `server/api/teams/index.post.ts` → `POST /api/teams`

### Zod validation on all endpoints

Every API endpoint validates its input using shared Zod schemas from `shared/schemas.ts`. This ensures consistent validation between client and server, and provides type inference via `z.infer<>`.

```ts
// shared/schemas.ts
export const CreateTeamRequest = z.object({
  name: z.string().min(1).max(50),
  pathway: z.enum(['junior', 'senior']).optional(),
})

// server/api/teams/index.post.ts
const body = await readValidatedBody(event, CreateTeamRequest.parse)
```

### D1-compatible SQLite wrapper

The `SQLiteDatabase` class in `server/utils/database.ts` wraps `better-sqlite3` to mimic the Cloudflare D1 interface. This means the same database code works identically in local development and production:

- `prepare(sql).bind(...).first()` — return first row
- `prepare(sql).bind(...).all()` — return `{ results: T[] }`
- `prepare(sql).bind(...).run()` — return `{ meta: { changed_db: number } }`
- `batch(statements)` — execute in a transaction
- `exec(sql)` — raw SQL execution

### Session-based auth

Authentication uses `nuxt-auth-utils` with session cookies. The session stores only `{ user: { id: number } }` — the full user record is fetched from the database on each request. Sessions have a 30-day max age.

### RBAC with fine-grained permissions

The `users.role` column stores space-separated permission strings (e.g., `"participant portal.users.view portal.teams.view"`). The `admin` permission always passes all checks. Permission helpers in `shared/permissions.ts` provide `hasPermission()`, `addPermission()`, and `removePermission()` utilities.

::: tip
See [Authentication & Authorization](./auth) for full details on the auth flow and permission system.
:::

### Shared code boundary

The `shared/` directory is the single source of truth for types, schemas, and constants used by both client and server. This prevents type drift and ensures validation rules are always in sync.

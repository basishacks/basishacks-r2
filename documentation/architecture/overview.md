---
title: Architecture Overview
description: High-level overview of the basishacks full-stack architecture, directory structure, data flow, and key design decisions.
---

# Architecture Overview

basishacks is a **full-stack Nuxt 4 application** that combines a Vue 3 frontend with a Nitro backend in a single deployable unit. It manages hackathon registration, team creation, project submission, peer voting, and judge scoring for the BIBS-C Network Hackathon (season 2, 2025–26).

<StatusBadge status="info" text="Stack: Nuxt 4 + SQLite" />

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
| Test Suite | Vitest with **<TestCount /> tests across 87 files** |

## Directory Structure

```
basishacks-r2/
├── app/                    # Nuxt app (Vue frontend)
│   ├── assets/css/         # Global styles (Tailwind + custom utilities)
│   ├── components/         # Vue components (includes SafeLink, SafeComark)
│   ├── layouts/            # Nuxt layouts (default, dashboard, fullwidth)
│   ├── middleware/          # Route middleware (auth.ts)
│   ├── pages/              # File-based routing
│   └── utils/              # Frontend utilities (consts, errors, loading, url-validation)
├── server/                 # Nitro backend
│   ├── api/                # API route handlers (file-based)
│   ├── middleware/         # Server middleware (security-headers and debug-lockdown)
│   ├── plugins/            # Database, Graph integration, and environment validation
│   ├── types/              # Type augmentations (H3EventContext)
│   └── utils/              # Server utilities
│       ├── database/       # Per-table DB helpers (users, teams, scores, etc.)
│       ├── auth.ts         # requireUser / requireJudge / requireAdmin / requirePermission
│       ├── convert.ts      # DB row -> public API object transformers
│       ├── rateLimit.ts    # In-memory rate limiter (4 tiers)
│       ├── oauth2.ts       # Public origin and callback URL helpers
│       ├── basis-auth.ts   # OIDC discovery, PKCE login, callback, and UserInfo
│       ├── oauth2-jwt.ts   # basis-auth resource-token validation
│       ├── profile.ts      # Profile picture helpers
│       ├── assets.ts       # Static and user asset helpers (path traversal prevention)
│       ├── scoring.ts      # Score aggregation and final ranking
│       ├── url-validation.ts   # SSRF prevention, private IP blocking, redirect URI validation
│       └── deepseek-store.ts   # DeepSeek AI chat session store
├── shared/                 # Code shared between client and server
│   ├── schemas.ts          # Zod schemas for API input validation
│   ├── database.d.ts       # TypeScript types inferred from the Drizzle schema
│   ├── responses.d.ts      # API response interface definitions
│   ├── auth.d.ts           # nuxt-auth-utils session type augmentation
│   ├── permissions.ts      # Fine-grained permission constants and helpers
│   ├── oauth2-scopes.ts    # OAuth2 scope definitions
│   ├── rubric.ts           # Judging rubric definitions
│   └── responses.d.ts      # API response interfaces
├── sql/archive/            # Archived legacy SQL schema and migrations
│   ├── init.sql            # Historical base schema
│   └── migration-*.sql     # Historical dated migrations
├── drizzle/                # Drizzle Kit generated migration files
├── tests/                  # Vitest test suite
│   ├── setup.ts            # Global test setup, in-memory DB, mocks
│   └── **/*.test.ts        # API, server, shared, component, page tests
├── bun-shim/               # Compatibility shim for `bun test`
│   └── shim.test.ts        # Prints guidance to use `bun run test`
├── bunfig.toml             # Redirects `bun test` to the guidance shim
├── start-fix.mjs           # Bun production start entrypoint
├── documentation/          # VitePress documentation
└── database/               # SQLite database file (basishacks.sqlite, WAL mode)
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
Nitro Server Middleware
  ├── security-headers.ts     (CSP, HSTS, X-Frame-Options, etc.)
  ├── debug-lockdown.ts       (404 debug routes when DISABLE_DEBUG_ROUTES is set)
  └── Rate limiting wrapper   (applied per-handler via applyRateLimit)
  │
  ▼
Nitro API Handler (server/api/**/*.ts)
  │  ├── Input validation via Zod schemas (length-bounded inputs)
  │  ├── Role/permission checks via requireUser/requireAdmin/requirePermission
  │  ├── OAuth2 JWT verification via withOAuth2JWT() wrapper
  │  └── Database access via event.context.drizzle
  │
  ▼
SQLite (bun:sqlite under Bun / better-sqlite3 under Node.js)
  │
  ▼
Response (JSON, converted via convertUserToPublic/convertTeamToPublic)
```

### Request context

Every incoming request has the following context attached by plugins and middleware:

| Context Key | Type | Set By | Purpose |
| --- | --- | --- | --- |
| `event.context.drizzle` | `BaseSQLiteDatabase` | `init-database.ts` plugin | Database access |
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
    pathway: z.enum(["junior", "senior"]).optional(),
});

// server/api/teams/index.post.ts
const body = await readValidatedBody(event, CreateTeamRequest.parse);
```

### Drizzle ORM database layer

The database layer uses Drizzle ORM with a runtime-agnostic SQLite driver (`bun:sqlite` under Bun, `better-sqlite3` under Node.js). Schema definitions in `server/database/schema.ts` provide type-safe queries. Migrations are applied automatically on startup by the custom runner in `server/database/migrate.ts`; Drizzle Kit is used to generate new migration files.

### Session-based auth

Authentication uses `nuxt-auth-utils` with session cookies. The session stores only `{ user: { id: number } }` — the full user record is fetched from the database on each request. Sessions have a 30-day max age with `httpOnly`, `secure`, and `sameSite: "lax"` cookie flags.

### RBAC with fine-grained permissions

The `users.role` column stores space-separated permission strings (e.g., `"participant portal.users.view portal.teams.view"`). The `admin` permission always passes all checks. Permission helpers in `shared/permissions.ts` provide `hasPermission()`, `addPermission()`, and `removePermission()` utilities.

::: tip See [Authentication & Authorization](./auth) for full details on the auth flow and permission system. :::

<CollapsibleDetails summary="Expand: request lifecycle in plain English">

1. The browser asks for a page or API resource.
2. Nuxt checks whether the route needs authentication.
3. Nitro applies server middleware (OAuth2 bridge, rate limiting).
4. The API handler validates input with Zod, checks permissions, and talks to SQLite.
5. The response is stripped of internal fields and returned as JSON.

</CollapsibleDetails>

### URL validation (client + server)

URL validation is enforced at both layers to prevent SSRF and open redirect attacks:

- **Server** (`server/utils/url-validation.ts`): Validates external URLs used in OAuth2 redirects and web fetches. Blocks private IP ranges, loopback addresses, and non-`http:`/`https:` protocols.
- **Client** (`app/utils/url-validation.ts`): The `isSafeUrl()` function used by `SafeLink` component ensures user-supplied links are either relative paths or safe `http:`/`https:` URLs. Unsafe URLs are rendered as inert strikethrough text.

### SafeLink / SafeComark frontend components

- **`SafeLink`** (`app/components/SafeLink.vue`): A link component that validates `href` URLs via `isSafeUrl()`. Safe external links open with `target="_blank" rel="noopener noreferrer"`; unsafe URLs are rendered as inert strikethrough text.
- **`SafeComark`** (`app/components/SafeComark.vue`): A Markdown rendering wrapper that uses `SafeLink` for all `<a>` tags, preventing XSS and open redirect via user-supplied content.

### Security middleware

Three Nitro server middleware files run on every request:

- **`security-headers.ts`** — Applies CSP, HSTS, `X-Frame-Options: DENY`, and other security headers to every response (pages and API).
- **`debug-lockdown.ts`** — Returns 404 for `/api/debug/*` and `/debug*` routes when `DISABLE_DEBUG_ROUTES` is set.

### Startup environment validation

The `validate-environment.ts` Nitro plugin performs mandatory checks at server startup:

- `NUXT_SESSION_PASSWORD` must be >= 32 bytes (fatal in production, warning in dev).
- All four `BASIS_AUTH_*` client values are required (fatal in production, warning in development).

### OAuth2 JWT utilities

The `basis-auth.ts` utility implements discovery and the browser login flow. `oauth2-jwt.ts` verifies protected-resource tokens against basis-auth JWKS with exact issuer, audience, algorithm, type, expiry, and scope checks.

`server/plugins/microsoft.ts` provides independent Graph features and is never used for login.

### Comprehensive test suite

The project includes **<TestCount /> tests across 87 files** covering API endpoints, server utilities, database helpers, shared schemas, Vue components, pages, and composables.

### Shared code boundary

The `shared/` directory is the single source of truth for types, schemas, and constants used by both client and server. This prevents type drift and ensures validation rules are always in sync.

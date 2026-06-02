# Architecture Overview

basishacks follows a **monorepo-style Nuxt 3 full-stack architecture** where the frontend (Vue 3), backend (Nitro), and shared code all live in a single repository.

## High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Vue Pages │  │Components │  │ Composables   │  │
│  └─────┬─────┘  └─────┬────┘  └───────┬───────┘  │
│        └───────────────┼───────────────┘          │
│                        │ useFetch / $fetch         │
└────────────────────────┼──────────────────────────┘
                         │
┌────────────────────────┼──────────────────────────┐
│                   Nitro Server                     │
│  ┌─────────────┐  ┌───┴────┐  ┌───────────────┐  │
│  │  Middleware  │  │  API   │  │   Plugins     │  │
│  │  (OAuth2)   │  │Routes  │  │ (DB, MS, Seed)│  │
│  └─────────────┘  └───┬────┘  └───────────────┘  │
│                        │                           │
│  ┌─────────────────────┴───────────────────────┐  │
│  │           Server Utilities                   │  │
│  │  ┌──────────┐ ┌─────────┐ ┌──────────────┐ │  │
│  │  │ Database │ │  Auth   │ │   Convert    │ │  │
│  │  │ Helpers  │ │ Helpers │ │  Transformers │ │  │
│  │  └──────────┘ └─────────┘ └──────────────┘ │  │
│  └─────────────────────────────────────────────┘  │
│                        │                           │
│  ┌─────────────────────┴───────────────────────┐  │
│  │           Database Layer                     │  │
│  │  SQLite (local) / Cloudflare D1 (prod)      │  │
│  └─────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────┐
│              Shared Code (client + server)         │
│  ┌──────────┐ ┌─────────┐ ┌──────┐ ┌──────────┐  │
│  │ Schemas  │ │  Types  │ │Rubric│ │Permissions│  │
│  └──────────┘ └─────────┘ └──────┘ └──────────┘  │
└───────────────────────────────────────────────────┘
```

## Key Architectural Decisions

### 1. Single Repository, Dual Runtime

The same codebase runs in two environments:
- **Local development**: Node.js with `better-sqlite3` (synchronous SQLite)
- **Production**: Cloudflare Workers with D1 (asynchronous, HTTP-based)

The `SQLiteDatabase` wrapper in `server/utils/database.ts` abstracts this difference by mimicking D1's `Statement` and `Database` interfaces.

### 2. File-Based Routing

Both frontend pages and backend API routes use file-based routing:
- **Pages**: `app/pages/` → Vue Router routes (e.g., `pages/dashboard/teams/index.vue` → `/dashboard/teams`)
- **API routes**: `server/api/` → Nitro routes (e.g., `server/api/teams/index.post.ts` → `POST /api/teams`)

### 3. Shared Validation Layer

Zod schemas in `shared/schemas.ts` are used by both the frontend (for form validation) and backend (for API input validation). This ensures consistency between what the UI expects and what the server enforces.

### 4. Permission-Based Access Control

Instead of simple role checks, the system uses a **dot-notation permission system** stored in the `role` field:
- Simple roles: `participant`, `judge`, `admin`
- Fine-grained permissions: `portal.users.view`, `dev_teams`, `portal.applications.create.firstparty`

The `hasPermission()` utility in `shared/permissions.ts` handles both, and `admin` implicitly grants all permissions.

### 5. In-Memory State

Several features use in-memory state that is **not persisted**:
- **OAuth2 authorize sessions** — `AUTHORIZE_SESSION_STORE` in `server/utils/oauth2-session.ts`
- **DeepSeek chat sessions** — `sessions` Map in `server/utils/deepseek-store.ts`
- **Rate limit histories** — `requestHistory` Map in `server/utils/rateLimit.ts`
- **Microsoft Graph tokens** — `metadata` object in `server/plugins/microsoft.ts`

This means server restarts lose this state. In production on Cloudflare Pages (edge functions), each isolate has its own in-memory state.

### 6. D1-Compatible Database Wrapper

The `SQLiteDatabase` class wraps `better-sqlite3` to provide the same interface as Cloudflare D1:
- `prepare(sql).bind(...params).first()` — returns a single row
- `prepare(sql).bind(...params).all()` — returns `{ results: T[] }`
- `prepare(sql).bind(...params).run()` — returns `{ meta: { changed_db: number } }`

This allows the same database code to work in both environments without changes.

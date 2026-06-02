# Environment Setup

## Prerequisites

- **Node.js** >= v24
- **Bun** (preferred package manager) — [install guide](https://bun.sh/)
- **Wrangler CLI** — for local D1 database management
- A code editor with Vue/TypeScript support (VS Code recommended)

## Installation

### 1. Clone and Install

```bash
git clone <repo-url>
cd basishacks-r2
bun i
```

### 2. Initialize the Database

The local development database uses `better-sqlite3` with a SQLite file at `./database/basishacks.sqlite`.

```bash
# Create the database schema
bunx wrangler d1 execute DB --file sql/init.sql

# Seed the hackathon table with initial state
bunx wrangler d1 execute DB --command 'INSERT INTO hackathon VALUES(1, "not_started", 0, 0, 0, 0, 0, NULL, NULL) ON CONFLICT DO NOTHING'
```

::: tip
The Nitro plugin `server/plugins/init-database.ts` also auto-creates the schema if the database is empty. The `seed-hackathon.ts` plugin adds missing columns and seeds default timestamps. You may not need to run the SQL manually if you just start the dev server.
:::

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

#### Required Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `NUXT_SESSION_PASSWORD` | Session encryption key (>= 32 bytes) | `a-very-long-random-string-at-least-32-bytes` |
| `NUXT_SEND_CODE_URL` | External webhook URL for sending login codes | `https://your-webhook.example.com/send-code` |
| `MICROSOFT_CLIENT_SECRET` | MS Entra app secret for Graph API | `abc123~DEF456...` |

#### Optional Variables

| Variable | Purpose |
|----------|---------|
| `MICROSOFT_DUMMY_USER_NAME` | ROPC test user email (for Teams chat features) |
| `MICROSOFT_DUMMY_USER_PASSWORD` | ROPC test user password |
| `CURRENT_URL_ORIGIN` | The public URL origin (required for OAuth2 callbacks in production) |
| `REDIRECT_URI` | DevConnect OAuth2 redirect URI path |
| `NUXT_OAUTH2_JWT_SECRET` | Secret for signing OAuth2 JWT access tokens |

### 4. Start the Development Server

```bash
# With HTTPS (recommended for OAuth2 callbacks)
bun dev --https

# Without HTTPS
bun dev
```

The dev server runs on **port 24598** by default. Access it at `https://localhost:24598`.

## Build Commands

```bash
# Development server
bun dev --https

# Production build (local preset = bun)
bun run build

# Production build (Cloudflare Pages preset)
bun run build --preset cloudflare-pages

# Preview built app
bun run preview

# Run tests
bun test

# Update Cloudflare types
bun run cf-types

# Format code
bun run format

# Check formatting
bun run format:check
```

## Database Migrations

Migrations are stored in `sql/migration-*.sql` and `sql/patch-*.sql`. There is no automated migration runner; migrations are applied manually via `wrangler d1 execute`:

```bash
# Apply a migration locally
bunx wrangler d1 execute DB --file sql/migration-2026-01-12-07-23Z.sql

# Apply a migration to production
bunx wrangler d1 execute DB --file sql/migration-2026-01-12-07-23Z.sql --remote
```

::: warning
Always back up the database before applying migrations in production.
:::

## Testing

Tests are run with Node.js directly (no framework):

```bash
bun test
```

This runs `node --env-file=.env tests/index.js`, which imports and executes:

- `test.oauth2.js` — OAuth2 flow tests
- `test.microsoft.ts` — Microsoft Graph API tests (mostly commented out; requires admin-approved permissions)
- `test.deepseek.ts` — DeepSeek API tests
- `test.search.ts` — Search functionality tests

Tests are simple async functions that return `true`/`false`.

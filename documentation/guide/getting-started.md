---
title: Getting Started
description: Get the basishacks hackathon platform running on your local machine.
---

# Getting Started

This guide walks you through setting up the **basishacks** development environment from scratch. By the end, you will have the app running locally with HTTPS on port 24598.

## Prerequisites

Before you begin, ensure you have the following installed:

| Requirement | Minimum Version | Notes |
|-------------|----------------|-------|
| **Node.js** | >= v24 | Required by the runtime and tooling |
| **Bun** | Latest | Preferred package manager; `npm` also works |
| **Git** | Any recent | For cloning the repository |

### Installing Bun

If Bun is not installed:

```bash
# macOS / Linux
curl -fsSL https://bun.sh/install | bash

# Windows
powershell -c "irm bun.sh/install.ps1 | iex"
```

Verify the installation:

```bash
bun --version
```

### Verifying Node.js

```bash
node --version
# Should output v24.x.x or higher
```

If you need to manage multiple Node.js versions, consider using [fnm](https://github.com/Schniz/fnm) or [nvm](https://github.com/nvm-sh/nvm).

## Clone the Repository

```bash
git clone <repository-url> basishacks-r2
cd basishacks-r2
```

## Install Dependencies

Install all project dependencies using Bun:

```bash
bun i
```

If you prefer npm:

```bash
npm install
```

## Initialize the Database

The local development environment uses SQLite with Drizzle ORM. The driver is selected automatically based on your runtime: `bun:sqlite` under Bun, or `better-sqlite3` under Node.js. The database is initialized automatically by the `init-database.ts` Nitro plugin when the dev server starts.

To manually initialize the database:

```bash
bun run db:migrate
```

This runs the Drizzle migrations, which create all required tables (`hackathon`, `teams`, `team_scores`, `users`, `ballots`, `ballot_scores`, `oauth2_applications`).

### Seed the Hackathon Row

The `hackathon` table requires a single row with `id = 1` that controls the global event state. The `seed-hackathon` plugin automatically seeds this row when the Nitro dev server starts. If you need to manually seed it, connect to the SQLite database directly:

```bash
sqlite3 database/basishacks.sqlite "INSERT INTO hackathon VALUES(1, 'not_started', 0, 0, 0, 0, 0, NULL, NULL) ON CONFLICT DO NOTHING"
```

### Apply Migrations

Migrations are managed via Drizzle Kit. To apply all pending migrations:

```bash
bun run db:migrate
```

To generate a new migration after schema changes:

```bash
bun run db:generate
```

## Configure Environment Variables

Copy the example environment file and fill in the required values:

```bash
cp .env.example .env
```

At minimum, set the following:

```bash
# REQUIRED - Must be at least 32 bytes
NUXT_SESSION_PASSWORD=your_random_string_at_least_32_bytes_long

# REQUIRED - Webhook URL for sending login codes
NUXT_SEND_CODE_URL=https://your-code-sending-service.com/send
```

See [Environment Setup](/guide/environment-setup) for the full list of variables.

## Run the Development Server

Start the dev server with HTTPS enabled:

```bash
bun dev --https
```

Or with npm:

```bash
npm run dev -- --https
```

The server starts on **port 24598** with HTTPS. Open your browser to:

```
https://localhost:24598
```

:::: warning
The `--https` flag is required because Microsoft OAuth2 and session cookies require a secure context. You may see a self-signed certificate warning in your browser — accept it to proceed.
::::

## Production Build

Build the application for production:

```bash
bun run build
```

Preview the production build:

```bash
bun run preview
```

The preview server runs on port 24598.

## Running Tests

The project uses [Vitest](https://vitest.dev) as its test framework. The suite
contains 600+ tests covering the API, server utilities, database helpers,
shared schemas, and frontend components.

```bash
# Run the full test suite (canonical command)
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage
```

These invoke `vitest run --pool=forks`, which resolves Nuxt's `~~/` and `~/`
path aliases via `vitest.config.ts` and runs `tests/setup.ts` as a setup file
to populate in-memory SQLite databases and Microsoft OAuth2 env vars.

### About `bun test`

Bun's native test runner (`bun test`) cannot resolve Nuxt's `~~/` and `~/`
path aliases, and the test files import their assertions from `vitest` rather
than `bun:test`. Running `bun test` would therefore produce dozens of
"Cannot find module '~~/...'" errors.

To avoid confusion, `bunfig.toml` scopes `bun test` to a single shim
(`bun-shim/shim.test.ts`) that prints guidance directing you to run
`bun run test` instead. The shim exits successfully so `bun test` never
appears to fail.

### Legacy test script

`tests/index.js` is a legacy manual test runner invoked via
`node --env-file=.env tests/index.js`. It is not part of the Vitest suite and
is rarely used.

## First Login Flow

Once the server is running, follow these steps to log in for the first time:

1. **Navigate to the login page** — Click the login button or go to `/login`.
2. **Enter your email** — Use a `@basischina.com` email address. The magic code auth system only accepts emails from this domain.
3. **Receive a verification code** — A 6-digit code is sent to your email (via the `NUXT_SEND_CODE_URL` webhook). In development, the code is also logged to the server console.
4. **Enter the code** — Type the 6-digit code on the verification screen. The code expires after 10 minutes.
5. **Access the dashboard** — After successful verification, you are redirected to the dashboard.

### Alternative Login Methods

- **Microsoft OAuth2** — Click the Microsoft login button. This redirects to Microsoft Entra ID (the tenant configured via `MICROSOFT_TENANT_ID`) for authentication.
- **basishacks connect** — A custom OAuth2 integration with PKCE support for connected applications.

### Gaining Admin Access

New users are assigned the `participant` role by default. To elevate your permissions for development:

1. Open the SQLite database directly:
   ```bash
   sqlite3 database/basishacks.sqlite
   ```
2. Update your user's role:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'your@basischina.com';
   ```
3. Refresh the browser — you should now have access to admin features and the developer portal.

## Verify Everything Works

After logging in, check the following:

- **Dashboard** loads at `/dashboard`
- **Teams page** is accessible at `/dashboard/teams`
- **Profile page** shows your user information at `/profile`
- **Admin/Developer portal** (if elevated) is available at `/developers`

## Next Steps

- [Project Overview](/guide/project-overview) — Understand the full project structure and features
- [Environment Setup](/guide/environment-setup) — Configure your development environment in detail
- [Architecture](/architecture/overview) — Deep dive into how the app works

---
title: Getting Started
description: Get the basishacks hackathon platform running on your local machine.
---

# Getting Started

This guide walks you through setting up the **basishacks** development environment from scratch. By the end, you will have the application running locally with HTTPS on port 24598.

<StatusBadge status="online" text="Docs build status: passing" />

## Prerequisites

Before you begin, ensure you have the following installed:

| Requirement | Minimum Version | Notes                                       |
| ----------- | --------------- | ------------------------------------------- |
| **Node.js** | >= v24          | Required by the runtime and tooling         |
| **Bun**     | Latest          | Preferred package manager; `npm` also works |
| **Git**     | Any recent      | For cloning the repository                  |

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

<TerminalWindow title="basishacks@setup:~" prompt="$">

```bash
git clone <repository-url> basishacks-r2
cd basishacks-r2
```

</TerminalWindow>

## Install Dependencies

Install all project dependencies using Bun:

```bash
bun i
```

If you prefer npm:

```bash
npm install
```

<CopyButton content="bun i" label="copy bun install" />

## Initialize the Database

The local development environment uses SQLite with Drizzle ORM. The driver is selected automatically based on your runtime: `bun:sqlite` under Bun, or `better-sqlite3` under Node.js.

Migrations and seeding run **automatically** when the Nitro dev server starts via the `init-database.ts` plugin, which calls `createDrizzleDatabase()` in `server/database/index.ts`. That helper selects the runtime's native SQLite driver, then runs `createAndMigrateDatabase()` from `server/database/migrate.ts` to apply pending migrations and seed the default hackathon row.

To manually initialize the database:

```bash
bun run db:migrate
```

This runs Drizzle Kit migrations, which create all required tables: `hackathon`, `teams`, `team_scores`, `users`, `ballots`, `ballot_scores`, `oauth2_applications`, `seasons`, `awards`, `team_awards`, `peer_voting_scores`, and `user_past_teams`.

### Seed the Hackathon Row

The `hackathon` table requires a single row with `id = 1` that controls the global event state. `seedHackathon()` in `server/database/migrate.ts` automatically inserts this row when the dev server starts. If you need to manually seed it, connect to the SQLite database directly:

```bash
sqlite3 database/basishacks.sqlite "INSERT INTO hackathon VALUES(1, 'not_started', 0, 0, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, NULL, NULL) ON CONFLICT DO NOTHING"
```

### Apply Migrations

Migrations are generated with Drizzle Kit:

```bash
# Generate a migration after schema changes
bun run db:generate
```

The `db:migrate` script applies pending migrations via Drizzle Kit. In practice, the server also applies migrations automatically on startup, so manual runs are usually unnecessary:

```bash
bun run db:migrate
```

## Configure Environment Variables

Copy the example environment file and fill in the required values:

```bash
cp .env.example .env
```

At minimum, set the following:

```bash
# REQUIRED - Session encryption key. Must be at least 32 bytes.
NUXT_SESSION_PASSWORD=your_random_string_at_least_32_bytes_long

# REQUIRED - basis-auth confidential client configuration
BASIS_AUTH_ISSUER=http://localhost:3000
BASIS_AUTH_CLIENT_ID=your_client_id
BASIS_AUTH_CLIENT_SECRET=your_client_secret
BASIS_AUTH_RESOURCE=urn:basis:api:basishacks
```

Set `CURRENT_URL_ORIGIN` to the basishacks origin and register `${CURRENT_URL_ORIGIN}/api/auth/basis/callback` with basis-auth. Microsoft variables are optional and used only for Graph features. See [Environment Setup](/guide/environment-setup) for the full list.

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

:::: warning Use the `--https` flag because Microsoft OAuth2 and secure session cookies require a trusted context. You may see a self-signed certificate warning in your browser; accept it to proceed. ::::

## Production Build

Build the application for production:

```bash
bun run build
```

For artifacts built by GitHub Actions, rewrite the embedded checkout root for the production server before packaging:

```bash
bun run refractor-artifact
```

This replaces `/home/runner/work/basishacks-r2/basishacks-r2` with `/home/devleaderz/basishacks-r2` throughout `.output/`.

Preview the production build:

```bash
bun run preview
```

The preview server runs on port 24598.

## Running Tests

The project uses [Vitest](https://vitest.dev) as its test framework. The suite maintains **100% line, branch, function, and statement coverage** on all tracked source files and currently contains **<TestCount /> passing tests** covering the API, server utilities, database helpers, shared schemas, and frontend components.

```bash
# Run the full test suite (canonical command)
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage
```

These invoke `vitest run --pool=forks`, which resolves Nuxt's `~~/` and `~/` path aliases via `vitest.config.ts` and runs `tests/setup.ts` as a setup file to populate in-memory SQLite databases and Microsoft OAuth2 environment variables. See the [Testing guide](/guide/testing) for more details on the coverage policy and excluded files.

### About `bun test`

Bun's native test runner (`bun test`) cannot resolve Nuxt's `~~/` and `~/` path aliases, and the test files import their assertions from `vitest` rather than `bun:test`. Running `bun test` would therefore produce dozens of "Cannot find module '~~/...'" errors.

To avoid confusion, `bunfig.toml` scopes `bun test` to a single shim (`bun-shim/shim.test.ts`) that prints guidance directing you to run `bun run test` instead. The shim exits successfully so `bun test` never appears to fail.

### Authentication integration tests

The active Vitest suite covers the basis-auth authorization request, callback transaction validation, verified identity linking, and protected-resource token validation.

### Legacy test script

`tests/index.js`, `tests/test.oauth2.js`, `tests/test.microsoft.ts`, and `tests/test.deepseek.ts` are legacy manual test runners kept for reference. They are not part of the active Vitest suite.

## First Login Flow

Once the server is running, follow these steps to log in for the first time:

1. **Navigate to the login page** — Click the login button or go to `/login`.
2. **Sign in with Microsoft** — Click the Microsoft login button. This redirects to Microsoft Entra ID (the tenant configured via `MICROSOFT_TENANT_ID`) for authentication.
3. **Access the dashboard** — After successful authentication, you are redirected to the dashboard.

### Alternative Login Methods

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
3. Refresh the browser. You should now have access to admin features and the mod portal.

## Verify Everything Works

After logging in, check the following:

- **Dashboard** loads at `/dashboard`
- **Teams page** is accessible at `/dashboard/teams`
- **Profile page** shows your user information at `/profile`
- **Admin/Mod portal** (if elevated) is available at `/developers`

## Next Steps

- [Project Overview](/guide/project-overview) — Understand the full project structure and features
- [Environment Setup](/guide/environment-setup) — Configure your development environment in detail
- [Architecture](/architecture/overview) — Deep dive into how the app works

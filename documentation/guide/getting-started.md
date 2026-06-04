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

The local development environment uses SQLite via `better-sqlite3`. You need to create the schema and seed the initial hackathon row.

### Create the Schema

```bash
bunx wrangler d1 execute DB --file sql/init.sql
```

This runs the base schema from `sql/init.sql`, which creates all required tables (`hackathon`, `teams`, `team_scores`, `users`, `ballots`, `ballot_scores`, `oauth2_applications`).

### Seed the Hackathon Row

The `hackathon` table requires a single row with `id = 1` that controls the global event state:

```bash
bunx wrangler d1 execute DB --command 'INSERT INTO hackathon VALUES(1, "not_started", 0, 0, 0, 0, 0, NULL, NULL) ON CONFLICT DO NOTHING'
```

:::: tip
When the Nitro dev server starts, the `seed-hackathon` plugin automatically seeds timestamps and the default `basishacks connect` OAuth2 application. You only need to run the seed command above if you're initializing the database outside the dev server.
::::

### Apply Migrations

If there are additional migration files in `sql/`, apply them in order:

```bash
bunx wrangler d1 execute DB --file sql/migration-2026-01-12-07-23Z.sql
bunx wrangler d1 execute DB --file sql/migration-2026-01-12-10-43Z.sql
# ... apply remaining migrations in chronological order
```

:::: tip
There is no automated migration runner. Migrations must be applied manually in order. Check the `sql/` directory for all migration and patch files.
::::

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
# Local Node.js server preset
bun run build

# Cloudflare Pages preset (for deployment)
bun run build --preset cloudflare-pages
```

Preview the production build:

```bash
bun run preview
```

The preview server runs on port 24598.

## Running Tests

The project uses a simple test runner without a framework such as Vitest or Jest:

```bash
bun test
```

This internally runs `node --env-file=.env tests/index.js`, which imports and executes:

- `test.oauth2.js` — OAuth2 flow tests
- `test.microsoft.ts` — Microsoft Graph API tests (mostly commented out; requires admin-approved permissions)
- `test.deepseek.ts` — DeepSeek API tests

Tests are simple async functions that return `true`/`false`.

## First Login Flow

Once the server is running, follow these steps to log in for the first time:

1. **Navigate to the login page** — Click the login button or go to `/login`.
2. **Enter your email** — Use a `@basischina.com` email address. The magic code auth system only accepts emails from this domain.
3. **Receive a verification code** — A 6-digit code is sent to your email (via the `NUXT_SEND_CODE_URL` webhook). In development, the code is also logged to the server console.
4. **Enter the code** — Type the 6-digit code on the verification screen. The code expires after 10 minutes.
5. **Access the dashboard** — After successful verification, you are redirected to the dashboard.

### Alternative Login Methods

- **Microsoft OAuth2** — Click the Microsoft login button. This redirects to Microsoft Entra ID (tenant `cbc6e1e2-a6bb-4002-bbdc-6da892a051a7`) for authentication.
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

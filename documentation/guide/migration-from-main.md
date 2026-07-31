---
title: Migration from main
description: Historical migration notes for the enhance-and-debloat branch and current repository state.
---

# Migration from main

::: info Historical Context The `enhance-and-debloat` branch was a PIN-to-PIN compatible upgrade from the original `main` branch. Its changes have since been merged into the current default branch, so the migration steps below are preserved for historical reference only. New clones should follow [Getting Started](/guide/getting-started). :::

## Fresh clone path

If you are starting from a clean checkout:

```bash
# Clone the repository
git clone <repository-url> basishacks-r2
cd basishacks-r2

# Install dependencies
bun install

# Configure environment
cp .env.example .env
# Edit .env and fill in the required values (see below)

# Build and test
bun run build
bun run test

# Start the server
bun start          # Bun runtime (uses start-fix.mjs)
# or
node .output/server/index.mjs   # Node.js runtime (uses better-sqlite3)
```

## Existing-database upgrade path

If you have an existing database from the original `main` branch:

1. **Back up the database** (recommended):

    ```bash
    cp database/basishacks.sqlite database/basishacks.sqlite.bak
    ```

2. **Start the server** — the `init-database.ts` plugin automatically:
    - Applies pending Drizzle migrations
    - Runs `migrateLegacySchema()` to add any missing tables (`seasons`, `team_awards`, `peer_voting_scores`, `user_past_teams`) and columns, and converts legacy award catalogs to namespace-keyed rows
    - Preserves all existing data

3. **Verify startup** — check the server logs for:
    ```
    [Nitro] Database plugin loaded with N tables
    Listening on http://[::]:3000
    ```

No manual SQL intervention is required.

## New required environment variables

The following credentials were previously hardcoded and are now read from environment variables. Add them to your `.env`:

| Variable | Purpose | Previously hardcoded as |
| --- | --- | --- |
| `MICROSOFT_TENANT_ID` | Microsoft Entra ID tenant ID | `cbc6e1e2-a6bb-4002-bbdc-6da892a051a7` |
| `MICROSOFT_CLIENT_ID` | Microsoft Entra ID application (client) ID | `868b989e-6574-4795-bcfb-8db37bee1c37` |
| `ONSITE_LOGIN_CLIENT_ID` | OAuth2 client_id used for the onsite login flow | `97e435f4-17e8-42ef-9b12-9684fd656de9` |

Find these values in the [Azure Portal](https://portal.azure.com) under **App Registrations** → your basishacks app → **Overview**.

The server automatically adds `${CURRENT_URL_ORIGIN}${REDIRECT_URI}` (default `http://localhost:3000/api/oauth2/dccallback`) to the `ONSITE_LOGIN_CLIENT_ID` application's allowed redirect URIs on startup, so no manual SQL update is needed for local development.

See [Environment Setup](/guide/environment-setup) for the complete list.

## Test command change

The canonical test command is `bun run test` (Vitest). Do not use `bun test` — Bun's native test runner cannot resolve Nuxt's `~~/` path aliases. See [Getting Started > Running Tests](/guide/getting-started#running-tests) for details.

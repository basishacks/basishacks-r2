---
title: Environment Setup
description: Configure environment variables, install tooling, and prepare your IDE for basishacks development.
---

# Environment Setup

This guide covers everything you need to configure before developing basishacks, from environment variables to IDE setup.

## Prerequisites

Ensure the following are installed before proceeding:

| Tool        | Version    | Install                                                   |
| ----------- | ---------- | --------------------------------------------------------- |
| **Node.js** | >= v24     | [nodejs.org](https://nodejs.org) or use a version manager |
| **Bun**     | Latest     | [bun.sh](https://bun.sh)                                  |
| **Git**     | Any recent | [git-scm.com](https://git-scm.com)                        |

### Node.js v24+ Installation

Using a version manager is recommended to easily switch between Node.js versions:

```bash
# Using fnm (recommended)
curl -fsSL https://fnm.vercel.app/install | bash
fnm install 24
fnm use 24

# Using nvm
nvm install 24
nvm use 24
```

Verify the installation:

```bash
node --version
# Should output v24.x.x or higher
```

:::: warning Node.js v24 or higher is required. Older versions may cause runtime errors or missing APIs. ::::

### Bun Installation

```bash
# macOS / Linux
curl -fsSL https://bun.sh/install | bash

# Windows
powershell -c "irm bun.sh/install.ps1 | iex"

# Verify
bun --version
```

## Clone and Install

```bash
git clone <repository-url> basishacks-r2
cd basishacks-r2
bun i
```

::: tip Dependency pins `package.json` uses `overrides` to pin two transitive dependencies:

- `vite` is pinned to `8.0.16`. Vite `8.1.x` combined with Nuxt `4.4.8` creates two HMR WebSocket listeners on the same HTTP server, crashing the dev server with `server.handleUpgrade() was called more than once with the same socket` ([nuxt/nuxt#35450](https://github.com/nuxt/nuxt/issues/35450)).
- `entities` is pinned to `7.0.1`. `entities@8` changes the `entities/decode` export and breaks `@vue/compiler-core`'s entity decoder, causing errors such as `decode.fromCodePoint is not a function` when Vue parses SFC templates (for example, `rules.vue`).

Keep both overrides in place until the affected packages release compatible versions. :::

## Database Initialization

The local development environment uses SQLite with a database file at `./database/basishacks.sqlite`. The underlying driver is selected automatically: `bun:sqlite` under Bun and `better-sqlite3` under Node.js. The database is initialized, migrated, and seeded automatically by the `init-database.ts` Nitro plugin when the dev server starts.

To manually initialize the database:

```bash
# Apply the Drizzle migration
bun run db:migrate
```

### Applying Migrations

Migrations are generated with Drizzle Kit:

```bash
# Generate a migration after schema changes
bun run db:generate
```

Applying migrations is normally handled automatically on server startup via the custom runner in `server/database/migrate.ts`. You can still invoke Drizzle Kit directly:

```bash
# Apply migrations
bun run db:migrate
```

### Resetting the Database

If you need to start fresh:

```bash
rm database/basishacks.sqlite
bun run db:migrate
```

## Environment Variables

The project uses environment variables for configuration. Copy the example file to get started:

```bash
cp .env.example .env
```

### Required Variables

| Variable | Description | Example |
| --- | --- | --- |
| `NUXT_SESSION_PASSWORD` | Session encryption key. **Must be at least 32 bytes.** | Output of `openssl rand -base64 32` |
| `BASIS_AUTH_ISSUER` | Exact basis-auth issuer URL | `http://localhost:3000` |
| `BASIS_AUTH_CLIENT_ID` | Registered confidential basishacks client ID | Provider-generated value |
| `BASIS_AUTH_CLIENT_SECRET` | Server-only basishacks client secret | Provider-generated value |
| `BASIS_AUTH_RESOURCE` | Resource audience registered for basishacks | `urn:basis:api:basishacks` |

::: tip Login is delegated to basis-auth. Register `${CURRENT_URL_ORIGIN}/api/auth/basis/callback` for each environment. :::

#### Generating a Session Password

```bash
openssl rand -base64 32
```

Copy the output and paste it as the value for `NUXT_SESSION_PASSWORD`.

### Optional Variables

#### Microsoft Entra ID

| Variable                  | Description                                                | Default |
| ------------------------- | ---------------------------------------------------------- | ------- |
| `MICROSOFT_TENANT_ID`     | Microsoft Entra ID tenant used by optional Graph features. | —       |
| `MICROSOFT_CLIENT_ID`     | Microsoft Entra ID client used by optional Graph features. | —       |
| `MICROSOFT_CLIENT_SECRET` | Microsoft Entra ID client secret for Graph features.       | —       |

#### Public origin

| Variable | Description | Default |
| --- | --- | --- |
| `CURRENT_URL_ORIGIN` | Public base origin used to derive `/api/auth/basis/callback`. | `http://localhost:3000` |

#### Integrations & Server

| Variable | Description | Default |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | DeepSeek API key for AI chat features (debug routes only). Uses the OpenAI SDK under the hood. | — |
| `PORT` | Server port override | `3000` |
| `HOST` | Server host override | `0.0.0.0` |
| `MICROSOFT_DUMMY_USER_NAME` | ROPC test user email (rarely used, testing only) | — |
| `MICROSOFT_DUMMY_USER_PASSWORD` | ROPC test user password (rarely used, testing only) | — |

#### Rate Limiting

| Variable | Description | Default |
| --- | --- | --- |
| `RATE_LIMIT_GENERAL_MAX` | General API rate limit, requests per minute | `6000` |
| `RATE_LIMIT_AUTH_MAX` | Authentication endpoint rate limit, attempts per minute | `600` |
| `RATE_LIMIT_VOTE_MAX` | Voting/scoring endpoint rate limit, submissions per minute | `600` |
| `RATE_LIMIT_UPLOAD_MAX` | File upload endpoint rate limit, uploads per minute | `600` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in milliseconds | `60000` |
| `TRUST_PROXY` | Set to any truthy value when behind a trusted reverse proxy so `x-forwarded-for` is used for rate-limit client IP resolution | unset |

#### Production

| Variable | Description | Default |
| --- | --- | --- |
| `DISABLE_DEBUG_ROUTES` | Set to any truthy value in production to disable `/api/debug/*` and `/debug` routes entirely | unset |

### Complete .env Example

```bash
# REQUIRED - Session encryption key, must be at least 32 bytes
NUXT_SESSION_PASSWORD=your_random_string_at_least_32_bytes_long

# REQUIRED - basis-auth confidential client configuration
BASIS_AUTH_ISSUER=http://localhost:3000
BASIS_AUTH_CLIENT_ID=your_basis_auth_client_id
BASIS_AUTH_CLIENT_SECRET=your_basis_auth_client_secret
BASIS_AUTH_RESOURCE=urn:basis:api:basishacks

# OPTIONAL - Microsoft Entra ID tenant ID (directory ID)
MICROSOFT_TENANT_ID=your_microsoft_tenant_id_here

# OPTIONAL - Microsoft Entra ID application (client) ID
MICROSOFT_CLIENT_ID=your_microsoft_client_id_here

# OPTIONAL - Microsoft Entra ID client secret for MS Graph API integration
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret_here

# OPTIONAL - Public basishacks origin; callback is /api/auth/basis/callback
CURRENT_URL_ORIGIN=http://localhost:3000


# OPTIONAL - DeepSeek API key for AI chat features (debug routes only)
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# OPTIONAL - Server port/host override
# PORT=3000
# HOST=0.0.0.0

# OPTIONAL - ROPC test credentials (testing only)
# MICROSOFT_DUMMY_USER_NAME=test_user@example.com
# MICROSOFT_DUMMY_USER_PASSWORD=test_password


# OPTIONAL - Rate limiting overrides (defaults shown)
# RATE_LIMIT_GENERAL_MAX=6000
# RATE_LIMIT_AUTH_MAX=600
# RATE_LIMIT_VOTE_MAX=600
# RATE_LIMIT_UPLOAD_MAX=600
# RATE_LIMIT_WINDOW_MS=60000


# OPTIONAL - Trust proxy for rate-limit client IP resolution
# TRUST_PROXY=true

# OPTIONAL - Disable debug routes in production
# DISABLE_DEBUG_ROUTES=true
```

## HTTPS Dev Server Setup

Use HTTPS for local development because Microsoft OAuth2 and secure session cookies require a trusted context:

```bash
bun dev --https
```

The server starts on **port 24598** (configured in `nuxt.config.ts` → `devServer.port`). Open:

```
https://localhost:24598
```

:::: warning The `--https` flag generates a self-signed certificate. Your browser will show a security warning — accept it to proceed. This is expected in local development. ::::

### Custom Port

To use a different port, pass the `--port` flag:

```bash
bun dev --https --port 3000
```

Or modify `nuxt.config.ts`:

```ts
devServer: {
  port: 3000,
}
```

## Database

The project uses Drizzle ORM with a runtime-agnostic SQLite driver. Under Bun the driver is `bun:sqlite`; under Node.js it falls back to `better-sqlite3`. The database file is stored at `./database/basishacks.sqlite` with WAL mode enabled.

The Drizzle ORM instance is created once at startup and attached to `event.context.drizzle` on every request via the `init-database.ts` Nitro plugin.

## IDE Setup

### VS Code (Recommended)

Install the following extensions for the best development experience:

| Extension | Purpose |
| --- | --- |
| [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar) | Vue 3 IntelliSense, type checking, and template support (formerly Volar) |
| [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) | Real-time linting |
| [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) | Code formatting |
| [TypeScript](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-typescript-next) | TypeScript language service |

### Recommended VS Code Settings

Add to `.vscode/settings.json`:

```json
{
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "typescript.tsdk": "node_modules/typescript/lib",
    "vue.inlayHints.inlineHandlerLeading": true
}
```

### EditorConfig

The project includes an `.editorconfig` file that enforces consistent formatting:

- Indent style: spaces
- Indent size: 2
- End of line: lf
- Charset: utf-8
- Trim trailing whitespace: yes
- Insert final newline: yes

## Prettier Configuration

The project uses Prettier with the following settings (defined in `.prettierrc`):

- **Semicolons enabled** — Statements end with semicolons
- **Double quotes** — Strings use double quotes instead of single quotes
- **Tab width 4** — Indentation uses 4 spaces
- **Trailing commas** — Trailing commas are added where valid

Example:

```ts
// Correct (project style)
const name = "basishacks";

// Wrong
const name = "basishacks";
```

## Production Configuration

In production on the VPS, environment variables are configured through the server environment (for example, systemd service file, `.env` file on the server, or a process manager). Set them before starting the server:

```bash
# Example: setting environment variables before starting the server
NUXT_SESSION_PASSWORD=<your-secret> bun run start
```

Or configure them in the server's environment file (for example, `/etc/environment`, systemd `EnvironmentFile`, or a `.env` file in the app directory).

:::: warning Never commit `.env` files to version control. The `.gitignore` file excludes `.env` by default. ::::

## Verifying Your Setup

After completing all configuration, verify everything works:

```bash
# 1. Install dependencies
bun i

# 2. Initialize the database
bun run db:migrate

# 3. Start the dev server
bun dev --https

# 4. Open https://localhost:24598 in your browser
```

If the page loads without errors, your environment is correctly configured.

## Troubleshooting

### Port Already in Use

If port 24598 is already in use:

```bash
# Find the process using the port (Windows)
netstat -ano | findstr :24598

# Kill the process
taskkill /PID <PID> /F

# Find the process using the port (macOS / Linux)
lsof -i :24598
kill -9 <PID>
```

### Database Errors

If you see database-related errors:

1. Delete the existing database file:
    ```bash
    rm database/basishacks.sqlite
    ```
2. Re-initialize:
    ```bash
    bun run db:migrate
    ```

### HTTPS Certificate Warnings

The self-signed certificate generated by Nuxt's `--https` flag will trigger browser warnings. This is expected in development. Accept the warning to proceed.

### Session Password Too Short

If you see errors about the session password:

```
Error: Session password must be at least 32 bytes
```

Generate a new password:

```bash
openssl rand -base64 32
```

And update `NUXT_SESSION_PASSWORD` in your `.env` file.

### Microsoft Graph API Unavailable

If the server logs `[MS Graph] MS Token Endpoint returned 401` or similar, the `MICROSOFT_CLIENT_SECRET` is either missing or invalid. Microsoft configuration affects Graph features only and does not control login.

### basis-auth Configuration Missing

The server validates `BASIS_AUTH_ISSUER`, `BASIS_AUTH_CLIENT_ID`, `BASIS_AUTH_CLIENT_SECRET`, and `BASIS_AUTH_RESOURCE` at startup:

- **Production:** any missing value is fatal.
- **Development/test:** missing values produce a warning; login remains unavailable until configured.

The client ID and secret come from basis-auth registration. The callback registered there must exactly match `${CURRENT_URL_ORIGIN}/api/auth/basis/callback`.

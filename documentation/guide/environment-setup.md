---
title: Environment Setup
description: Configure environment variables, install tooling, and prepare your IDE for basishacks development.
---

# Environment Setup

This guide covers everything you need to configure before developing basishacks — from environment variables to IDE setup.

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

## Database Initialization

The local development environment uses `better-sqlite3` with a SQLite database file at `./database/basishacks.sqlite`. The database is initialized automatically by the `init-database.ts` Nitro plugin when the dev server starts.

To manually initialize the database:

```bash
# Apply the Drizzle migration
bun run db:migrate
```

### Applying Migrations

Migrations are managed via Drizzle Kit:

```bash
# Generate a migration after schema changes
bun run db:generate

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
| `NUXT_SEND_CODE_URL` | Webhook/service URL for sending login verification codes to `@basischina.com` emails | `https://your-service.com/send` |
| `ONSITE_LOGIN_CLIENT_ID` | OAuth2 `client_id` of the basishacks app used by the onsite login flow. The server auto-adds `${CURRENT_URL_ORIGIN}/${REDIRECT_URI}` to this app's allowed redirect URIs on startup. | `97e435f4-17e8-42ef-9b12-9684fd656de9` |

#### Generating a Session Password

```bash
openssl rand -base64 32
```

Copy the output and paste it as the value for `NUXT_SESSION_PASSWORD`.

### Optional Variables

| Variable | Description | Default |
| --- | --- | --- |
| `MICROSOFT_CLIENT_SECRET` | Microsoft Entra ID client secret for Graph API integration. Enables MS OAuth2 login and MS Graph features (meeting scheduling, Teams chat). | — |
| `MICROSOFT_TENANT_ID` | Microsoft Entra ID tenant (directory) ID. Required together with `MICROSOFT_CLIENT_ID` for MS OAuth2 login and MS Graph features. If unset, Microsoft features are disabled gracefully. | — |
| `MICROSOFT_CLIENT_ID` | Microsoft Entra ID application (client) ID. Required together with `MICROSOFT_TENANT_ID` for MS OAuth2 login and MS Graph features. If unset, Microsoft features are disabled gracefully. | — |
| `CURRENT_URL_ORIGIN` | Base origin URL for OAuth2 redirect callbacks (no trailing slash). Must match the redirect URI registered in Azure Portal. | `http://localhost:3000` |
| `MICROSOFT_REDIRECT_URI` | Microsoft OAuth2 redirect URI path (must start with `/`). Must exactly match the redirect URI registered in Azure Portal. Defaults to `/api/oauth2/mscallback`; `/api/auth` is also supported as an alias handler. | `/api/oauth2/mscallback` |
| `DEEPSEEK_API_KEY` | DeepSeek API key for AI chat features (debug routes only). Uses the OpenAI SDK under the hood. | — |
| `NUXT_OAUTH2_JWT_SECRET` | JWT signing secret for OAuth2 token exchange. Used by `jose` to sign and verify access tokens (HS256). Generate with `openssl rand -base64 32`. | — |
| `REDIRECT_URI` | Onsite OAuth2 redirect URI path used by `/api/login`. The server auto-registers `${CURRENT_URL_ORIGIN}/${REDIRECT_URI}` for `ONSITE_LOGIN_CLIENT_ID`. Defaults to `api/oauth2/dccallback`; do not set to `/api/auth` (reserved for the MS callback alias). | `api/oauth2/dccallback` |
| `MICROSOFT_DUMMY_USER_NAME` | ROPC test user email (rarely used, testing only) | — |
| `MICROSOFT_DUMMY_USER_PASSWORD` | ROPC test user password (rarely used, testing only) | — |
| `PORT` | Server port override | `3000` |
| `HOST` | Server host override | `0.0.0.0` |

### Complete .env Example

```bash
# REQUIRED - Session encryption key (>= 32 bytes)
NUXT_SESSION_PASSWORD=your_random_string_at_least_32_bytes_long

# REQUIRED - Webhook URL for sending login codes
NUXT_SEND_CODE_URL=https://your-code-sending-service.com/send

# OPTIONAL - Microsoft Entra ID client secret
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret_here

# OPTIONAL - Microsoft Entra ID tenant ID (directory ID)
MICROSOFT_TENANT_ID=your_microsoft_tenant_id_here

# OPTIONAL - Microsoft Entra ID application (client) ID
MICROSOFT_CLIENT_ID=your_microsoft_client_id_here

# OPTIONAL - Base origin URL for OAuth2 callbacks
CURRENT_URL_ORIGIN=http://localhost:3000

# OPTIONAL - Microsoft OAuth2 redirect URI path
# Must match the redirect URI registered in Azure Portal
# Defaults to /api/oauth2/mscallback; /api/auth is also supported as an alias
MICROSOFT_REDIRECT_URI=/api/oauth2/mscallback

# OPTIONAL - DeepSeek API key
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# OPTIONAL - OAuth2 JWT signing secret
NUXT_OAUTH2_JWT_SECRET=your_oauth2_jwt_secret_here

# OPTIONAL - Onsite OAuth2 redirect URI path for /api/login
# Defaults to api/oauth2/dccallback. Do not use /api/auth here.
REDIRECT_URI=api/oauth2/dccallback

# REQUIRED for onsite login - OAuth2 client_id of the basishacks app
# The server auto-adds ${CURRENT_URL_ORIGIN}/${REDIRECT_URI} to its allowed
# redirect URIs on startup if missing.
ONSITE_LOGIN_CLIENT_ID=your_onsite_login_client_id_here

# OPTIONAL - ROPC test credentials (testing only)
# MICROSOFT_DUMMY_USER_NAME=test_user@example.com
# MICROSOFT_DUMMY_USER_PASSWORD=test_password

# OPTIONAL - Server port/host
# PORT=3000
# HOST=0.0.0.0
```

## HTTPS Dev Server Setup

The dev server requires HTTPS because Microsoft OAuth2 and session cookies need a secure context:

```bash
bun dev --https
```

The server starts on **port 24598** (configured in `nuxt.config.ts` → `devServer.port`). Open:

```
https://localhost:24598
```

:::: warning The `--https` flag generates a self-signed certificate. Your browser will show a security warning — accept it to proceed. This is expected in local development. ::::

### Custom Port

To use a different port, set the `PORT` environment variable:

```bash
PORT=3000 bun dev --https
```

Or modify `nuxt.config.ts`:

```ts
devServer: {
  port: 3000,
}
```

## Database

The project uses Drizzle ORM with `better-sqlite3` for both local development and production. The database file is stored at `./database/basishacks.sqlite` with WAL mode enabled.

The Drizzle ORM instance is attached to `event.context.drizzle` on every request via the `init-database.ts` Nitro plugin.

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

- **No semicolons** — Semicolons are omitted
- **Single quotes** — Strings use single quotes instead of double quotes

Example:

```ts
// Correct (project style)
const name = "basishacks";

// Wrong
const name = "basishacks";
```

## Production Configuration

In production on the VPS, environment variables are configured through the server environment (e.g., systemd service file, `.env` file on the server, or a process manager). Set them before starting the server:

```bash
# Example: setting environment variables before starting the server
NUXT_SESSION_PASSWORD=<your-secret> bun run start
```

Or configure them in the server's environment file (e.g., `/etc/environment`, systemd `EnvironmentFile`, or a `.env` file in the app directory).

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

If the server logs `[MS Graph] MS Token Endpoint returned 401` or similar, the `MICROSOFT_CLIENT_SECRET` is either missing or invalid. If the server logs `[MSGraph] MICROSOFT_TENANT_ID or MICROSOFT_CLIENT_ID not set - Microsoft Graph features will be unavailable`, set `MICROSOFT_TENANT_ID` and `MICROSOFT_CLIENT_ID` (the Azure app's tenant and client IDs). Microsoft OAuth2 login and Graph API features will be unavailable until these are configured, but the rest of the application will work normally.

### OAuth2 JWT Secret Missing

If you see `NUXT_OAUTH2_JWT_SECRET is not set` when trying to use OAuth2 token exchange, generate and set the secret:

```bash
openssl rand -base64 32
```

Add it to your `.env`:

```bash
NUXT_OAUTH2_JWT_SECRET=<generated-secret>
```

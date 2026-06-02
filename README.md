# basishacks

The official website for the BIBS-C Network Hackathon (season 2, 2025–26). A full-stack Nuxt 3 application managing hackathon registration, team creation, project submission, peer voting, judge scoring, and a custom OAuth2 developer platform (DevConnect).

> 📖 **Full documentation** is available in the [`documentation/`](./documentation/) directory as a VitePress site. See [Documentation](#documentation) for details.

## Features

- **Hackathon Management** — Event state control (not_started, in_progress, voting, finished, paused), scheduling, and submissions
- **Team System** — Team creation, member management, project submission (name, description, demo URL, repo URL), and pathway assignment (junior/senior)
- **Peer Voting** — Star-based voting with scores that must sum to exactly 12 across 4 assigned projects from the same pathway
- **Judge Scoring** — Rubric-based judging with weighted criteria (0–5 per criterion), different weightings for junior and senior pathways
- **Score Calculation** — Final scores: 25% peer voting + 75% judge scores, with automated ranking
- **Authentication** — Magic code email login (`@basischina.com`), Microsoft Entra ID OAuth2, and custom DevConnect OAuth2
- **DevConnect / OAuth2 Platform** — Developer portal for creating and managing OAuth2 applications with:
  - Client secret management (SHA-256 hashed, multiple secrets supported)
  - Redirect URI management with HTTPS/localhost validation
  - Scope permission management (`openid`, `profile`, `email`, `meetings.*`) with admin-only scope support
  - OAuth2 authorization code flow with PKCE support
  - OAuth2 URL generator for sharing authorization links
  - JWT access tokens with scope-based claims
- **Permission-Based Access Control** — Fine-grained dot-notation permissions (e.g., `portal.users.view`) stored in the user's role field, with admin bypass
- **Developer Portal** — Permission-gated admin interface for user/team management, OAuth2 application configuration, file uploads, and DeepSeek AI chat sessions
- **Microsoft Graph Integration** — Meeting creation, Teams chat messaging, webhook subscriptions, and a DeepSeek-powered chatbot with tool calling
- **Asset Management** — Profile pictures (jdenticon fallback), team images, and file uploads

## Technology Stack

| Layer            | Technology                                           |
| ---------------- | ---------------------------------------------------- |
| Framework        | Nuxt 3                                               |
| UI               | @nuxt/ui ^4.6.1 (Tailwind CSS v4)                    |
| Language         | TypeScript 5.6+                                      |
| Runtime          | Node.js >= v24                                       |
| Package Manager  | Bun (preferred); npm works                           |
| Database (local) | better-sqlite3 with WAL mode                         |
| Database (prod)  | Cloudflare D1                                        |
| Auth             | nuxt-auth-utils (session-based)                      |
| Validation       | Zod 4.x                                              |
| Fonts            | @nuxt/fonts (local provider)                         |
| Icons            | @iconify-json/lucide, @iconify-json/material-symbols |
| Linting          | @nuxt/eslint + Prettier                              |
| Deployment       | Cloudflare Pages                                     |

## Project Structure

```
app/                    # Nuxt app (Vue frontend)
  assets/css/           # Global styles
  components/           # Vue components
  layouts/              # Nuxt layouts
  middleware/           # Route middleware
  pages/                # File-based routing
  utils/                # Frontend utilities

server/                 # Nitro backend
  api/                  # API route handlers
  middleware/           # Server middleware
  plugins/              # Nitro plugins (DB init, MS Graph)
  utils/                # Server utilities
    database.ts         # SQLite wrapper (D1-compatible)
    database/*.ts       # Per-table DB helpers
    auth.ts             # Role enforcement helpers
    oauth2-validate.ts  # OAuth2 request validation

shared/                 # Code shared between client and server
  schemas.ts            # Zod validation schemas
  database.d.ts         # DB TypeScript types
  permissions.ts        # DevPermissions + helpers
  oauth2-scopes.ts      # OAuth2 scope definitions

sql/                    # Schema and migrations
  init.sql              # Base schema
  migration-*.sql       # Dated migrations
  patch-*.sql           # Feature patches

database/               # Local SQLite file
```

## Local Setup

### Requirements

- Node.js >= v24
- Bun (preferred) or npm

### 1. Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

| Variable                  | Purpose                              |
| ------------------------- | ------------------------------------ |
| `NUXT_SESSION_PASSWORD`   | Session encryption key (>= 32 bytes) |
| `NUXT_SEND_CODE_URL`      | Webhook URL for sending login codes  |
| `MICROSOFT_CLIENT_SECRET` | MS Entra app secret                  |

### 2. Install Dependencies

Using Bun:

```bash
bun i
```

Using npm:

```bash
npm i
```

### 3. Initialize Database

Using Bun:

```bash
bunx wrangler d1 execute DB --file sql/init.sql
bunx wrangler d1 execute DB --command 'INSERT INTO hackathon VALUES(1, "not_started", 0, 0, 0, 0, 0, NULL, NULL) ON CONFLICT DO NOTHING'
```

Using npm:

```bash
npx wrangler d1 execute DB --file sql/init.sql
npx wrangler d1 execute DB --command 'INSERT INTO hackathon VALUES(1, "not_started", 0, 0, 0, 0, 0, NULL, NULL) ON CONFLICT DO NOTHING'
```

### 4. Run Migrations

Apply any pending migrations:

```bash
# Example: apply all migration files
for f in sql/migration-*.sql; do bunx wrangler d1 execute DB --file "$f"; done
```

### 5. Start Development Server

```bash
# Using Bun
bun dev --https

# Using npm
npm run dev -- --https
```

The dev server runs on port 24598 with HTTPS.

## Development Commands

```bash
# Dev server (HTTPS, port 24598)
bun dev --https

# Production build (local node-server preset)
bun run build

# Production build (Cloudflare Pages)
bun run build --preset cloudflare-pages

# Preview built app
bun run preview

# Run tests
bun test

# Update Cloudflare types
bun run cf-types
```

## Testing

Tests are simple async functions run with Node.js (no framework like Vitest):

```bash
bun test
# Internally: node --env-file=.env tests/index.js
```

## OAuth2 / DevConnect

The project includes a full OAuth2 authorization server (DevConnect) for third-party and first-party application integrations.

### Authorization Flow

1. Developer registers an app in the Developers Portal
2. Configures secrets, redirect URIs, and scope permissions in the Authorization tab
3. Uses the **OAuth2 URL Generator** to create an authorization link
4. Users visit the link, authenticate, and approve scopes
5. App exchanges the authorization code for a JWT access token at `/api/oauth2/token`

### Scope Definitions

Scopes are defined in `shared/oauth2-scopes.ts`. Public scopes can be added by any app owner; admin-only scopes require admin privileges.

| Scope                              | Description                                     | Access     |
| ---------------------------------- | ----------------------------------------------- | ---------- |
| `openid`                           | Basic OpenID Connect identity                   | Public     |
| `profile`                          | User profile information                        | Public     |
| `email`                            | User's email address                            | Public     |
| `offline_access`                   | Maintain access to granted resources            | Public     |
| `meetings.read.application`        | Read app-generated meetings                     | Public     |
| `meetings.read.all`                | Read all meetings                               | Admin only |
| `meetings.readwrite.application`   | Read/write app-generated meetings               | Public     |
| `meetings.readwrite.all`           | Read/write all meetings                         | Admin only |

### Token Endpoint

```
POST /api/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=<authorization_code>
&client_id=<client_id>
&client_secret=<client_secret>
&redirect_uri=<redirect_uri>
```

Response:

```json
{
  "access_token": "<jwt>",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

## Deployment

Pushes to `main` trigger `.github/workflows/deploy-cloudflare.yml`:

1. Check out code
2. Setup Bun 1.3.0
3. `bun install`
4. `bun run build --preset cloudflare-pages`
5. Deploy `dist/` to Cloudflare Pages

Required repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Security

- **Rate limiting** — In-memory per-instance limiter (60 req/min default)
- **Input validation** — Zod on every API endpoint
- **RBAC** — Server-side role enforcement; never trust frontend
- **Secret storage** — Client secrets are SHA-256 hashed; only shown once on creation
- **Session encryption** — `nuxt-auth-utils` with 32-byte minimum password
- **Foreign keys** — Enforced via `PRAGMA foreign_keys = ON`

## Documentation

Comprehensive technical documentation is available in the [`documentation/`](./documentation/) directory as a VitePress site.

### Running the Documentation Site

```bash
cd documentation
npm install
npm run dev
```

### Documentation Structure

| Section | Description |
|---------|-------------|
| **Guide** | Getting started, project overview, environment setup |
| **Architecture** | Runtime architecture, database design, authentication, OAuth2 system |
| **Frontend** | Vue components, pages, layouts, composables & utilities |
| **Backend** | API reference (54 endpoints), server utilities, plugins & middleware |
| **Shared Code** | Zod schemas, TypeScript types, rubric system, permissions, OAuth2 scopes |
| **Deployment** | Cloudflare deployment, security considerations, rate limiting |

## License

Internal project for the BIBS-C Network Hackathon.

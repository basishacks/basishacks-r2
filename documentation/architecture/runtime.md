# Runtime Architecture

## Local Development

```
┌─────────────────────────────────────────────┐
│              Nuxt Dev Server                 │
│              (port 24598, HTTPS)             │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │           Vite Dev Server                │ │
│  │  - HMR for Vue components               │ │
│  │  - TypeScript transpilation             │ │
│  │  - Tailwind CSS processing              │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │           Nitro Server                   │ │
│  │  - File-based API routing               │ │
│  │  - Server middleware pipeline           │ │
│  │  - Plugin initialization                │ │
│  │  - Database connection                  │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │         better-sqlite3                   │ │
│  │  - ./database/basishacks.sqlite         │ │
│  │  - WAL mode for concurrent reads        │ │
│  │  - Foreign keys enforced                │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Nitro Preset: `bun`

The `nuxt.config.ts` sets `nitro.preset: 'bun'` for local development. This uses Bun's runtime for the server.

### Plugin Initialization Order

Nitro plugins run in alphabetical order by filename:

1. **`init-database.ts`** — Initializes the SQLite database, creates schema if empty, attaches `SQLiteDatabase` wrapper to `event.context.db` on every request
2. **`microsoft.ts`** — Initializes Microsoft Graph API access token via client credentials flow, sets up webhook subscriptions
3. **`seed-hackathon.ts`** — Adds missing columns to the hackathon table, seeds default timestamps and the DevConnect OAuth2 application

### Request Lifecycle

Every HTTP request goes through:

1. **Nitro server** receives the request
2. **`request` hook** — `init-database.ts` attaches `event.context.db`
3. **Server middleware** — `oauth2-authorize.ts` validates OAuth2 authorize requests
4. **API route handler** — processes the request
5. **Response** sent back to client

## Production (Cloudflare Pages)

```
┌─────────────────────────────────────────────┐
│           Cloudflare Edge Network            │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │        Cloudflare Pages Function         │ │
│  │  - Nitro server (cloudflare-pages preset)│ │
│  │  - Each route = edge function            │ │
│  │  - Isolated execution contexts           │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │          Cloudflare D1                   │ │
│  │  - Binding name: DB                     │ │
│  │  - SQLite at the edge                   │ │
│  │  - Asynchronous API                     │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Key Differences from Local

| Aspect | Local | Production |
|--------|-------|------------|
| Database | `better-sqlite3` (sync) | Cloudflare D1 (async) |
| DB path | `event.context.db` (SQLiteDatabase) | `event.context.db` (D1Database) |
| File system | Available (`public/assets/`, `public/userast/`) | Read-only (no file uploads) |
| In-memory state | Single process | Per-isolate (not shared) |
| Rate limiting | Per-process | Per-isolate |
| OAuth2 sessions | Single process | Per-isolate (lost on restart) |

### Build Process

```bash
bun run build --preset cloudflare-pages
```

This generates a `dist/` directory with:
- Static assets (HTML, CSS, JS)
- `_worker.js` — the Cloudflare Pages Function entry point

### Deployment Pipeline

Pushes to `main` trigger `.github/workflows/deploy-cloudflare.yml`:

1. Check out code
2. Setup Bun 1.3.0
3. `bun install`
4. `bun run build --preset cloudflare-pages`
5. Deploy `dist/` to Cloudflare Pages project `basishacks2025` via Wrangler

Required repository secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

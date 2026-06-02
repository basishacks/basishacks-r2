# Cloudflare Deployment

## Production Architecture

The application is deployed on **Cloudflare Pages** with a **D1** database binding.

```
┌──────────────────────────────────────────┐
│           Cloudflare Edge Network         │
│                                           │
│  ┌─────────────────────────────────────┐  │
│  │     Cloudflare Pages Function        │  │
│  │  - Nitro (cloudflare-pages preset)   │  │
│  │  - Edge functions per route          │  │
│  └─────────────────────────────────────┘  │
│                  │                         │
│  ┌───────────────┴─────────────────────┐  │
│  │          Cloudflare D1              │  │
│  │  - Binding name: DB                │  │
│  │  - SQLite at the edge              │  │
│  └─────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

## Configuration

### wrangler.jsonc

The Wrangler configuration file defines:

- **D1 binding**: `DB` — the database binding name used in `event.context.env.DB`
- **Pages project**: `basishacks2025`
- **Compatibility date**: Set for the latest Cloudflare Workers runtime

### Build Command

```bash
bun run build --preset cloudflare-pages
```

This generates a `dist/` directory with static assets and a `_worker.js` entry point.

## CI/CD Pipeline

Pushes to `main` trigger `.github/workflows/deploy-cloudflare.yml`:

```yaml
# Simplified workflow
1. Checkout code
2. Setup Bun 1.3.0
3. bun install
4. bun run build --preset cloudflare-pages
5. Deploy dist/ to Cloudflare Pages via Wrangler
```

### Required Secrets

| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | API token with Pages deployment permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account identifier |

## Environment Variables

Production environment variables are configured in the Cloudflare Pages dashboard or via Wrangler secrets:

| Variable | Purpose |
|----------|---------|
| `NUXT_SESSION_PASSWORD` | Session encryption key (>= 32 bytes) |
| `NUXT_SEND_CODE_URL` | Webhook URL for sending login codes |
| `MICROSOFT_CLIENT_SECRET` | MS Entra app secret |
| `NUXT_OAUTH2_JWT_SECRET` | Secret for signing OAuth2 JWTs |
| `CURRENT_URL_ORIGIN` | Public URL origin (e.g., `https://basishacks.example.com`) |
| `REDIRECT_URI` | DevConnect redirect URI path |

## Database Migrations in Production

```bash
# Apply migration to production D1
bunx wrangler d1 execute DB --file sql/migration-xxx.sql --remote
```

::: warning
Always test migrations locally before applying to production. Back up the D1 database before destructive migrations.
:::

## Limitations

### File System

Cloudflare Pages Functions have a **read-only file system**. This means:

- File uploads (`POST /api/debug/upload`) will not work in production
- Profile picture uploads that write to `public/assets/` or `public/userast/` will not persist
- The `createAsset` and `createUserAsset` functions in `server/utils/assets.ts` will fail

To work around this, file storage should be migrated to an external service (e.g., Cloudflare R2, S3).

### In-Memory State

Each Cloudflare isolate has its own in-memory state:

- OAuth2 authorize sessions are not shared across instances
- DeepSeek chat sessions are not shared
- Rate limit counters are per-isolate
- Microsoft Graph tokens are per-isolate

This means:
- OAuth2 flows must complete within the same isolate (usually fine for single-request flows)
- Long-lived sessions (DeepSeek) may be lost when isolates are recycled
- Rate limiting is per-isolate, not globally distributed

### Cold Starts

Edge functions may experience cold starts, which can add latency to the first request after a period of inactivity.

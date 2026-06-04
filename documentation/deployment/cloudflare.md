---
title: Cloudflare Deployment
description: Deploying basishacks to Cloudflare Pages via GitHub Actions
---

# Cloudflare Deployment

The basishacks application is deployed to Cloudflare Pages via a GitHub Actions workflow triggered by pushes to the `main` branch.

::: info Source
`.github/workflows/deploy-cloudflare.yml`
:::

## GitHub Actions Workflow

**Workflow name:** Deploy

**Trigger:**
- Push to `main` branch
- Manual dispatch (`workflow_dispatch`)

**Concurrency:**
- Group: `basishacks-cloudflare-deploy`
- Ensures only one deployment runs at a time; newer runs cancel older in-progress runs

### Workflow Steps

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deploy
    permissions:
      contents: read
      deployments: write
    steps:
      - uses: actions/checkout@v4
      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.3.0
      - name: Install dependencies
        run: bun install
      - name: Build
        run: bun run build --preset cloudflare-pages
      - name: Deploy
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=basishacks2025
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

| Step | Action | Details |
|------|--------|---------|
| 1. Checkout | `actions/checkout@v4` | Clones the repository |
| 2. Setup Bun | `oven-sh/setup-bun@v2` | Installs Bun version **1.3.0** |
| 3. Install | `bun install` | Installs all dependencies |
| 4. Build | `bun run build --preset cloudflare-pages` | Builds the Nuxt app with the Cloudflare Pages preset |
| 5. Deploy | `cloudflare/wrangler-action@v3` | Deploys `dist/` to Cloudflare Pages |

## Cloudflare Configuration

| Setting | Value |
|---------|-------|
| D1 binding name | `DB` |
| Production project | `basishacks2025` |
| Build preset | `cloudflare-pages` |
| Output directory | `dist/` |

The D1 binding is configured in `wrangler.jsonc` and provides the production database. The same `event.context.db` interface used in local development is backed by the D1 binding in production.

## Required Secrets

The following secrets must be configured in the GitHub repository settings:

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Pages deployment permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account identifier |
| `GITHUB_TOKEN` | Automatically provided by GitHub Actions |

## Production Environment Variables

These are configured in the Cloudflare Pages dashboard or via Wrangler secrets:

| Variable | Purpose |
|----------|---------|
| `NUXT_SESSION_PASSWORD` | Session encryption key (≥ 32 bytes) |
| `NUXT_SEND_CODE_URL` | Webhook URL for sending login codes |
| `MICROSOFT_CLIENT_SECRET` | Microsoft Entra app secret |
| `NUXT_OAUTH2_JWT_SECRET` | Secret for signing OAuth2 JWT tokens |

## Local Build for Cloudflare

To build locally with the Cloudflare Pages preset:

```bash
bun run build --preset cloudflare-pages
```

To preview the built app:

```bash
bun run preview   # port 24598
```

## Database Migrations

Migrations are applied manually via Wrangler:

```bash
# Apply a migration
bunx wrangler d1 execute DB --file sql/migration-20250101.sql

# Run an ad-hoc command
bunx wrangler d1 execute DB --command "SELECT * FROM hackathon"
```

There is no automated migration runner — each migration must be applied manually before or after deployment.

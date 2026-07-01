# basishacks

The official website for the BIBS-C Network Hackathon (season 2, 2025–26).

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Nuxt 3 |
| UI | @nuxt/ui ^4.6.1 (Tailwind CSS v4) |
| Language | TypeScript 5.6+ |
| Runtime | Node.js >= v24 or Bun (dual-runtime support) |
| Package Manager | Bun (preferred); npm works |
| Database | SQLite via Drizzle ORM (bun:sqlite under Bun, better-sqlite3 under Node.js) |
| Auth | nuxt-auth-utils (session-based) |
| Validation | Zod 4.x |
| Fonts | @nuxt/fonts (local provider) |
| Icons | @iconify-json/lucide, @iconify-json/material-symbols |
| Linting | @nuxt/eslint + Prettier |
| Deployment | Node.js server (VPS) |

## Project Structure

Follow this structure when adding / patching new information

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
  database/             # Drizzle ORM schema, migrations, dual-runtime init
  utils/                # Server utilities
    database/*.ts       # Per-table DB helpers (Drizzle ORM)
    auth.ts             # Role enforcement helpers
    rateLimit.ts        # In-memory rate limiter
    oauth2-validate.ts  # OAuth2 request validation
    oauth2-jwt.ts       # OAuth2 JWT verification + scope checks

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
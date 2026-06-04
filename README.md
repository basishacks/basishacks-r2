# basishacks

The official website for the BIBS-C Network Hackathon (season 2, 2025–26).

## Technology Stack

| Layer            | Technology                                           |
| ---------------- | ---------------------------------------------------- |
| Framework        | Nuxt 3                                               |
| UI               | @nuxt/ui ^4.8.1 (Tailwind CSS v4)                    |
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
  init.sql              # Base schema (includes performance indexes)
  migration-*.sql       # Dated migrations
  patch-*.sql           # Feature patches

public/                 # Static assets
  img/                  # Application images (error.svg, Microsoft_logo.svg)
  assets/               # User-uploaded files (gitignored)
  fonts/                # Custom fonts

documentation.zip       # Compressed VitePress documentation archive

database/               # Local SQLite file (gitignored)
```

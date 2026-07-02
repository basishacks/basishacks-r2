# PR: Enhance & Debloat — Main Compatibility, OAuth2 PKCE, Runtime-Agnostic Database, and Developer Experience

**Source branch:** `enhance-and-debloat` **Target branch:** `main` **Status:** Ready for review

---

## Summary

This branch modernizes the basishacks platform for the 2025–26 season without introducing user-facing breaking changes. It switches authentication to Microsoft-only login with PKCE, removes hardcoded credentials, makes the SQLite database layer runtime-agnostic between Bun and Node.js, repairs legacy schema drift, expands automated test coverage to 647 passing tests, and rewrites the VitePress documentation site. The result is a maintainable, secure, and documented foundation for deployment on a standard VPS.

---

## What Changed (High Level)

### 1. Authentication — Microsoft-Only Login Plus PKCE

- Removed the magic-code email login flow entirely:
    - Deleted `server/api/auth/code.post.ts`
    - Deleted `server/api/auth/login.post.ts`
- Microsoft OAuth2 is now the only login method for the hackathon registry.
- Implemented PKCE (`code_verifier` plus S256 `code_challenge`) for the Microsoft login flow.
- De-hardcoded Microsoft tenant and client IDs and the onsite-login client ID; the application now reads them from environment variables.
- Fixed OAuth2 scope encoding so scopes are encoded exactly once.
- Fixed operator precedence in OAuth2 error-message construction.
- Restricted `code_challenge_method` validation to `S256` or `plain` per RFC 7636.
- Restored the original onsite-login redirect behavior: `REDIRECT_URI` defaults to `api/oauth2/dccallback`.
- Preserved `/api/auth` as an alias handler for the Microsoft OAuth2 callback.
- Fixed the `bridge_id` cookie lifecycle so the cookie is available when `/api/oauth2/dccallback` runs.

### 2. Database — Runtime-Agnostic Driver Plus Self-Healing Migrations

- Added `server/database/index.ts` to select `bun:sqlite` under Bun and `better-sqlite3` under Node.js automatically.
- Added `server/database/schema.ts` as the single Drizzle ORM schema source of truth.
- Replaced the non-functional `drizzle-kit migrate` path with a custom migration runner in `server/database/migrate.ts` that:
    - Reads `drizzle/*.sql` migration files.
    - Tracks applied migrations in `_drizzle_migrations`.
    - Repairs legacy schemas from older `sql/archive/init.sql` databases.
    - Auto-adds the missing `teams.sourcing` column.
    - Seeds the onsite OAuth2 application and registers its redirect URI.
- Archived the old hand-written SQL files under `sql/archive/`.
- Kept `start-fix.mjs` as the production entry point.

### 3. OAuth2 Application Auto-Configuration

- `seedOAuth2ApplicationRedirectUri` in `server/database/migrate.ts` ensures that `${CURRENT_URL_ORIGIN}/${REDIRECT_URI}` is present in the allowed redirect URIs for `ONSITE_LOGIN_CLIENT_ID` on startup.
- This removes the manual SQL step previously required after fresh checkouts or origin changes.

### 4. Security Hardening

- De-hardcoded Microsoft Graph API credentials in `server/plugins/microsoft.ts`.
- Lazy-initialized the DeepSeek/OpenAI client and added a clear 503 error when `DEEPSEEK_API_KEY` is missing.
- Added a startup guard for `NUXT_OAUTH2_JWT_SECRET` that exits in production if the secret is missing or shorter than 32 bytes.
- Sanitized API error responses and improved webhook error handling.
- Added auth middleware, admin guards, and extension whitelisting to debug endpoints.
- Rate-limited OAuth2 session creation.
- Bound the OAuth2 callback flow to the `bridge_id` session cookie to prevent orphaned callbacks.

### 5. Frontend Fixes

- Fixed the Vue "could not access render before initialization" warning by moving `onUnmounted` to the top level and reordering `definePageMeta` and `useHead` before `await useFetch` in `app/pages/showcase.vue`.
- Made `demoLink` optional in `ResultsProjectLinks.vue` to eliminate missing-required-prop warnings.
- Removed an undeclared `ProjectCard` prop and sanitized identicon names.
- Added `app/utils/oauth2.ts` and `app/utils/sanitize.ts` helpers.
- Fixed the main hackathon site layout so content uses the full viewport width instead of leaving blank space on the sides:
    - Removed the global max-width constraint from `app/app.config.ts` so `UContainer`, `UHeader`, and `UFooter` all span the viewport.
    - Updated `app/layouts/default.vue` to wrap content in a full-width padded container.
    - Updated `app/layouts/dashboard.vue` and `app/pages/user/[id].vue` to remove remaining max-width containers.
    - Widened forms in `app/pages/profile.vue`, `app/pages/dashboard/teams/index.vue`, `app/components/ProjectForm.vue`, and `app/components/TeamForm.vue` to `w-full`.

### 6. Testing Infrastructure

- Expanded the suite to **647 passing tests (647/647)** using Vitest.
- Added `bun-shim/shim.test.ts` and `bunfig.toml` so `bun test` points users to the Vitest suite instead of failing on Nuxt path aliases.
- Added comprehensive tests for:
    - OAuth2 redirect URIs, PKCE validation, and session creation
    - Microsoft callback handling
    - Database-to-public conversion
    - Database helpers for users, teams, members, ballots, scores, seasons, OAuth2 apps, peer voting, and awards
    - Server utilities for assets, conversion, deepseek-store, election IRV, oauth2-jwt, oauth2-validate, profile, rate limiting, URL validation, and validate-oauth2-jwt-secret
    - Shared modules for permissions, schemas, rubric, seasons, awards, and oauth2-scopes
    - Frontend components and pages
- Added `tests/setup.ts` and `vitest.config.ts`.

### 7. Documentation and VitePress Terminal Theme

- Rewrote `README.md` with current environment variables, run commands, and architecture notes.
- Added `documentation/guide/migration-from-main.md`.
- Updated all existing VitePress pages across `guide/`, `architecture/`, `backend/`, `deployment/`, and `shared/` to match the current codebase.
- Added new VitePress pages:
    - `documentation/guide/voting-and-elections.md`
    - `documentation/backend/debug-and-ai.md`
    - `documentation/shared/awards.md`
    - `documentation/shared/seasons.md`
- Registered all new pages in `documentation/.vitepress/config.ts`.
- Replaced the hardcoded "AREMENA" ASCII banner on the documentation home page with a dynamic `HACKATHON` banner generated by the `figlet` package using the `ANSI Shadow` font in `documentation/.vitepress/theme/components/InteractiveHero.vue`.
- Improved the VitePress theme to look like a real modern UNIX terminal session:
    - Set `appearance: "dark"` in `documentation/.vitepress/config.ts` so the site defaults to a dark terminal palette.
    - Updated `documentation/.vitepress/theme/style.css` with terminal-inspired green text on dark backgrounds, rounded corners, and cohesive shadows.
    - Removed excessive CRT glow and scanline effects while keeping the terminal feel subtle.
    - Made the documentation home hero full width and cleaned up unused decorative CSS.
    - Added a VT323 font import for the display typeface while keeping IBM Plex Mono for body text.
- Removed Easter-egg trigger documentation from the public VitePress pages.
- Verified `cd documentation && npm run build` succeeds.

### 8. Code Style and Formatting

- Standardized the entire repository on the existing Prettier configuration in `.prettierrc`:
    - `semi: true`, `singleQuote: false`, `tabWidth: 4`, `trailingComma: all`, and `printWidth: 100`.
- Reformatted 280-plus files across `app/`, `server/`, `tests/`, `shared/`, `documentation/`, and configuration files.
- Fixed brittle source-string tests that asserted single-quote formatting or single-line event handlers:
    - `tests/pages/debug.test.ts`
    - `tests/pages/user.test.ts`
    - `tests/server/plugins/init-database.test.ts`
    - `tests/server/api/debug/upload.test.ts`
    - `tests/components/ModalConfirm.test.ts`
    - `tests/composables/useApiUser.test.ts`
- These tests now match the double-quote, multi-line Prettier output and remain resilient to future formatting changes.

### 9. Repository Hygiene

- Updated `.gitignore` to exclude agent and skill working artifacts (`skills-*.json`, `test-agent-file.txt`).
- Removed commented-out code blocks during debloating.
- Deleted Cloudflare-specific build scripts and the obsolete `worker-configuration.d.ts`.
- Archived legacy SQL migrations under `sql/archive/`.

---

## Detailed Per-File Change List

### Configuration & Environment

| File | Change |
| --- | --- |
| `.env.example` | Added all required and optional environment variables with inline documentation |
| `.gitignore` | Added agent and skill artifact exclusions |
| `package.json` | Updated to Bun-first scripts; added Vitest, coverage, and Drizzle Kit scripts; removed Cloudflare-specific dependencies |
| `nuxt.config.ts` | Adjusted dev server port and runtime config |
| `drizzle.config.ts` | Added Drizzle Kit configuration |
| `vitest.config.ts` | Added Vitest configuration with `pool=forks` and test setup |
| `bunfig.toml` | Redirects `bun test` to the Vitest suite |
| `bun-shim/shim.test.ts` | Provides a compatibility shim message for `bun test` |
| `start-fix.mjs` | Preserved as the production entry point |

### Database & Migrations

| File                         | Change                                                         |
| ---------------------------- | -------------------------------------------------------------- |
| `server/database/index.ts`   | New runtime-agnostic SQLite driver selector                    |
| `server/database/schema.ts`  | New canonical Drizzle ORM schema                               |
| `server/database/migrate.ts` | New custom migration runner, legacy schema repair, and seeding |
| `drizzle/*.sql`              | New Drizzle Kit-generated migrations                           |
| `drizzle/meta/*`             | New Drizzle Kit metadata snapshots                             |
| `sql/archive/*`              | Archived old hand-written SQL files                            |

### Authentication & OAuth2

| File | Change |
| --- | --- |
| `server/api/auth/index.get.ts` | Restored as an alias for the Microsoft OAuth2 callback |
| `server/api/auth/impersonate.post.ts` | Preserved admin impersonation endpoint |
| `server/api/auth/code.post.ts` | **Deleted** (magic-code login removed) |
| `server/api/auth/login.post.ts` | **Deleted** (magic-code login removed) |
| `server/api/login.get.ts` | Rewritten to construct a PKCE-based onsite OAuth2 URL |
| `server/api/oauth2/mscallback.get.ts` | Updated Microsoft callback with PKCE fallback and environment variables |
| `server/api/oauth2/dccallback.get.ts` | Rewritten to bind to the `bridge_id` cookie and verify the PKCE verifier |
| `server/api/oauth2/session.post.ts` | Rate-limited; fixed error handling and operator precedence |
| `server/api/oauth2/session.get.ts` / `session.delete.ts` | Preserved with session state fixes |
| `server/api/oauth2/token.post.ts` | PKCE code-verifier verification |
| `server/api/oauth2/userinfo.get.ts` | OIDC UserInfo with JWT scope checks |
| `server/api/oauth2/to_microsoft.post.ts` | Generates Microsoft OAuth2 URL from environment config |
| `server/middleware/oauth2-authorize.ts` | Validates authorize requests, sets the `bridge_id` cookie, and handles Microsoft proxying |
| `server/utils/oauth2.ts` | Microsoft OAuth2 URL builder using environment variables |
| `server/utils/oauth2-validate.ts` | Authorization request validation and consent flow |
| `server/utils/oauth2-jwt.ts` | JWT signing and verification with `jose` |
| `server/utils/url-validation.ts` | Centralized redirect URI and external URL validation |
| `server/utils/validate-oauth2-jwt-secret.ts` | Shared guard for `NUXT_OAUTH2_JWT_SECRET` |
| `server/plugins/validate-oauth2-jwt-secret.ts` | Startup plugin that uses the guard |

### Users, Teams, Scoring, Voting

| File | Change |
| --- | --- |
| `server/api/users/*.ts` | Refactored to use Drizzle ORM and permission checks |
| `server/api/teams/*.ts` | Refactored to use Drizzle ORM; added scoring endpoint |
| `server/api/teams/[id]/scores/index.post.ts` | New judge scoring endpoint |
| `server/api/ballot/index.get.ts` / `index.post.ts` | Peer voting using the `peer_voting_scores` table |
| `server/api/ballot/summary.get.ts` | Per-season judging summary |
| `server/api/admin/teams.get.ts` / `teams.delete.ts` / `scores.get.ts` | Admin team and score management |
| `server/utils/database/*.ts` | Per-table Drizzle helpers for users, teams, members, ballots, scores, seasons, OAuth2 apps, peer voting, awards, and hackathon |
| `server/utils/convert.ts` | Updated public transformers with awards and sourcing |
| `server/utils/election.ts` | Hard-coded student-council positions and candidates plus an IRV algorithm |
| `server/api/election/*` | Election candidate, vote, results, and admin endpoints |
| `shared/schemas.ts` | Updated validation schemas for teams, users, scores, votes, OAuth2, and elections |
| `shared/responses.d.ts` | Updated API response interfaces, including awards and election types |

### Debug, AI, and Microsoft Graph

| File | Change |
| --- | --- |
| `server/plugins/microsoft.ts` | De-hardcoded Graph credentials; centralized token, meeting, chat, and webhook helpers |
| `server/api/chatbot/message.get.ts` | OAuth2 JWT-protected Teams chat test endpoint |
| `server/api/chatbot/index.get.ts` | Placeholder health-check endpoint |
| `server/api/_webhooks/update.post.ts` / `lifecycle.post.ts` | Graph webhook endpoints with improved validation |
| `server/api/debug/upload.post.ts` | File upload with extension whitelist and path validation |
| `server/api/debug/files.get.ts` | Lists uploaded assets |
| `server/api/debug/deepseek/sessions/*.ts` | DeepSeek chat session CRUD |
| `server/api/debug/deepseek/sessions/[id]/message.post.ts` | Lazy OpenAI client, Barron Wang prompt, and tool loop |
| `server/utils/deepseek-store.ts` | In-memory chat session store |
| `server/utils/assets.ts` | Safe file read and write helpers |
| `server/utils/profile.ts` | Identicon generation with sanitized names |

### Frontend

| File | Change |
| --- | --- |
| `app/pages/showcase.vue` | Fixed lifecycle ordering and scroll-driven animations |
| `app/components/ResultsProjectLinks.vue` | Made `demoLink` optional; fixed prop warnings |
| `app/components/ProjectCard.vue` | Removed undeclared prop |
| `app/components/JudgeProgressCard.vue` | Minor fixes |
| `app/components/ModalConfirm.vue` | Minor fixes |
| `app/components/TeamForm.vue` | Member management improvements |
| `app/components/RoleHeader.vue` | Conditional navigation updates |
| `app/composables/useApiUser.ts` | User fetch composable |
| `app/middleware/auth.ts` | Redirects unauthenticated users to `/api/login` |
| `app/pages/api/oauth2/authorize.vue` | OAuth2 login and consent UI with PKCE support |
| `app/pages/developers/*.vue` | Developer portal pages with permission gates |
| `app/pages/temp/vote/*.vue` | Student-council election voting UI |
| `app/pages/dashboard/*.vue` | Dashboard, project editing, results, and team management |
| `app/pages/voting.vue` | Peer voting UI |
| `app/pages/index.vue` | Home page with active season data |
| `app/utils/oauth2.ts` / `sanitize.ts` | New frontend helpers |
| `app/app.config.ts` | Removed the global `UContainer` max-width so header, footer, and content use the full viewport width |
| `app/layouts/default.vue` | Replaced constrained container with a full-width padded wrapper |
| `app/layouts/dashboard.vue` | Removed max-width constraint on the dashboard content area |
| `app/layouts/default-background.vue` | Full-width container with padding |
| `app/pages/profile.vue` | Widened the profile form to `w-full` |
| `app/pages/user/[id].vue` | Full-width public profile page |
| `app/pages/temp/vote/index.vue` / `all.vue` | Full-width voting pages |
| `app/pages/dashboard/teams/index.vue` | Full-width team creation form |
| `app/components/ProjectForm.vue` | Full-width project form |
| `app/components/TeamForm.vue` | Full-width rename and add-member modal forms |

### Tests

| File                          | Change                                           |
| ----------------------------- | ------------------------------------------------ |
| `tests/setup.ts`              | Global test setup, in-memory database, and mocks |
| `tests/api/*.test.ts`         | API endpoint tests                               |
| `tests/server/**/*.test.ts`   | Server utility and database helper tests         |
| `tests/shared/*.test.ts`      | Shared module tests                              |
| `tests/components/*.test.ts`  | Vue component tests                              |
| `tests/composables/*.test.ts` | Composable tests                                 |
| `tests/middleware/*.test.ts`  | Middleware tests                                 |
| `tests/pages/*.test.ts`       | Page tests                                       |
| `tests/smoke.test.ts`         | Smoke tests                                      |

### Documentation

| File | Change |
| --- | --- |
| `README.md` | Rewritten with current setup, environment variables, and architecture |
| `AGENTS.md` | Updated project context for AI agents |
| `documentation/guide/getting-started.md` | Updated install and run instructions |
| `documentation/guide/project-overview.md` | Updated features, stack, and directory structure |
| `documentation/guide/environment-setup.md` | Updated environment variables, database setup, and troubleshooting |
| `documentation/guide/migration-from-main.md` | New migration guide |
| `documentation/guide/voting-and-elections.md` | **New** peer voting and election IRV guide |
| `documentation/architecture/*.md` | Updated runtime, database, auth, and OAuth2 docs |
| `documentation/backend/api-reference.md` | Updated endpoint reference |
| `documentation/backend/server-utilities.md` | Updated utility docs, including election and URL validation |
| `documentation/backend/plugins-middleware.md` | Updated plugin and middleware docs |
| `documentation/backend/debug-and-ai.md` | **New** debug, DeepSeek, and chatbot reference |
| `documentation/frontend/components.md` | Updated component docs, including `VotingProjectCard` |
| `documentation/frontend/pages.md` | Updated page docs, including election pages |
| `documentation/frontend/composables.md` | Updated composables and utilities |
| `documentation/frontend/layouts.md` | Updated layout docs |
| `documentation/shared/schemas.md` | Updated Zod schema reference |
| `documentation/shared/types.md` | Updated type definitions with awards and election types |
| `documentation/shared/permissions.md` | Updated permission system docs |
| `documentation/shared/oauth2-scopes.md` | Updated scope docs |
| `documentation/shared/rubric.md` | Updated rubric docs |
| `documentation/shared/awards.md` | **New** awards system docs |
| `documentation/shared/seasons.md` | **New** seasons docs |
| `documentation/deployment/security.md` | Updated security practices; removed Easter-egg operator note |
| `documentation/deployment/rate-limiting.md` | Updated rate limiting docs |
| `documentation/.vitepress/config.ts` | Registered new pages and nav items |
| `documentation/package.json` | Added `figlet` dependency for dynamic ASCII banners |
| `documentation/.vitepress/theme/components/InteractiveHero.vue` | Dynamic `HACKATHON` ASCII banner generated with `figlet` (`ANSI Shadow` font) |
| `documentation/.vitepress/theme/style.css` | Refined terminal theme: full-width hero, rounded corners, reduced glow, removed unused decorative CSS |
| `documentation/guide/documentation-site.md` | Removed public Easter-egg documentation |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in at least the required values:

### Required

| Variable                 | Purpose                                                      |
| ------------------------ | ------------------------------------------------------------ |
| `NUXT_SESSION_PASSWORD`  | Session encryption key (at least 32 bytes)                   |
| `NUXT_OAUTH2_JWT_SECRET` | JWT signing secret for OAuth2 tokens (at least 32 bytes)     |
| `ONSITE_LOGIN_CLIENT_ID` | `client_id` of the basishacks connect first-party OAuth2 app |

### Optional (for Microsoft features)

| Variable | Purpose |
| --- | --- |
| `MICROSOFT_TENANT_ID` | Microsoft Entra ID tenant ID |
| `MICROSOFT_CLIENT_ID` | Microsoft Entra ID application ID |
| `MICROSOFT_CLIENT_SECRET` | Microsoft Entra ID client secret |
| `MICROSOFT_REDIRECT_URI` | Microsoft OAuth2 redirect URI path (default `/api/oauth2/mscallback`) |

### Optional (for development)

| Variable             | Purpose                                                            |
| -------------------- | ------------------------------------------------------------------ |
| `CURRENT_URL_ORIGIN` | Base origin for OAuth2 callbacks (default `http://localhost:3000`) |
| `REDIRECT_URI`       | Onsite OAuth2 redirect path (default `api/oauth2/dccallback`)      |
| `DEEPSEEK_API_KEY`   | DeepSeek API key for AI chat features                              |
| `PORT` / `HOST`      | Server port and host overrides                                     |

---

## Verification

- `bun install` — passes
- `bun run build` — passes
- `bun run test` — **647/647 tests pass**
- `bun run format:check` — passes
- `cd documentation && npm run build` — passes
- Clean merge with latest `main`

---

## Deployment Instructions

1. Copy `.env.example` to `.env` and fill in the required variables.
2. Ensure the Azure App Registration redirect URI matches `MICROSOFT_REDIRECT_URI` (default `/api/oauth2/mscallback`).
3. The server will automatically register `${CURRENT_URL_ORIGIN}/${REDIRECT_URI}` for `ONSITE_LOGIN_CLIENT_ID`, so no manual SQL update is needed for the onsite login flow.
4. Build with `bun run build`.
5. Start with `bun run start` (or `node .output/server/index.mjs`).

---

## Known Limitations / Follow-Up Work

- **In-memory stores:** OAuth2 authorization sessions and DeepSeek chat sessions are stored in memory and are lost on server restart. This behavior is acceptable for short-lived flows but will not scale horizontally.
- **Rate limiting:** The current rate limiter is in-memory and per-process. Consider a shared store, such as Redis, if the app is deployed across multiple instances.
- **Election candidates:** Student-council candidates and positions are hard-coded in `server/utils/election.ts`. Future seasons will require a source-code update or a database-driven candidate management UI.
- **Chatbot webhook:** Microsoft Graph webhook subscriptions expire after one day and are refreshed manually or by lifecycle notifications. A scheduled job may be needed for production reliability.
- **Microsoft Graph ROPC user:** Chat operations rely on a dummy user configured via `MICROSOFT_DUMMY_USER_NAME` and `MICROSOFT_DUMMY_USER_PASSWORD`. Microsoft is deprecating ROPC; a delegated-flow alternative should be evaluated.
- **Node.js compatibility:** The app builds and runs under Node.js, but Bun is the preferred runtime. Always test production behavior under the runtime you intend to deploy.

---

## Files Worth Reviewing

- `server/api/login.get.ts`
- `server/api/oauth2/mscallback.get.ts`
- `server/api/oauth2/dccallback.get.ts`
- `server/utils/oauth2.ts`
- `server/utils/oauth2-validate.ts`
- `server/database/migrate.ts`
- `server/database/index.ts`
- `server/plugins/microsoft.ts`
- `server/api/debug/deepseek/sessions/[id]/message.post.ts`
- `app/pages/showcase.vue`
- `app/components/ResultsProjectLinks.vue`
- `.env.example`
- `README.md`
- `documentation/guide/migration-from-main.md`
- `documentation/guide/voting-and-elections.md`
- `documentation/backend/debug-and-ai.md`
- `documentation/shared/awards.md`
- `documentation/shared/seasons.md`

---

## Documentation Site & Continuous Integration

### VitePress Documentation Site

This branch ships a new VitePress 1.6.4 documentation site in the `documentation/` directory. The site provides interactive features, including local full-text search, a dark terminal appearance, clean URLs, code-block line numbers, and GitHub edit links. The sidebar and top navigation are organized into five sections: Guide, Architecture, Frontend, Backend, and Shared Code. New pages cover peer voting and elections, debug and AI endpoints, awards, and seasons.

The documentation theme was rebuilt to feel like a real UNIX terminal session:

- **Dark terminal palette** with a true-black background (`#000000`), classic terminal green text (`#33ff33`), and no decorative shadows or rounded corners.
- **VT323 display typeface** for headings, combined with IBM Plex Mono body text for readability.
- **Custom Vue components** registered globally in `documentation/.vitepress/theme/index.ts`:
    - `AnimatedCounter` — animates numbers into view, used for rubric score ranges.
    - `CollapsibleDetails` — accessible, styled disclosure blocks.
    - `CopyButton` — one-click copying of code snippets and commands.
    - `EasterEggOverlay` — full-screen overlays for keyboard-triggered surprises.
    - `InteractiveHero` — animated landing hero with a `HACKATHON` ASCII banner, status indicators, and action buttons.
    - `QuoteCycler` — clickable rotating quotes on the home page and security page.
    - `StatusBadge` — live-status pills for online, warning, error, and info states.
    - `TerminalWindow` — UNIX-style terminal windows for command examples.
- **Keyboard easter eggs** handled by `useEasterEggs.ts`:
    - Konami code (`↑ ↑ ↓ ↓ ← → ← → B A`) triggers a retro "system breach" ASCII art overlay.
    - `Ctrl+Shift+H` opens a "Hack the Planet" mainframe screen.
    - `Ctrl+Shift+M` drops a Matrix-style digital rain overlay.
- **Responsive design** with breakpoints at 768px, 480px, and 360px, plus `prefers-reduced-motion` support.
- **Utility classes** for blinking cursors, terminal blocks, network grids, and ASCII art.

The site uses its own `package.json` and builds with `npm run build`.

### GitHub Actions Workflows

Two workflows run on every push and pull request to `main` and `enhance-and-debloat`:

- **CI (`.github/workflows/ci.yml`)**
    - Installs dependencies with Bun and caches `node_modules`.
    - Runs the full Vitest suite (`bun run test`).
    - Builds the Nuxt application (`bun run build`).
    - Installs documentation dependencies with Node.js 22, caches them, and builds the VitePress site.
    - Uses concurrency groups to cancel redundant runs.

- **Lint (`.github/workflows/lint.yml`)**
    - Installs dependencies with Bun.
    - Runs `bun run format:check` to enforce Prettier formatting.
    - Uses concurrency groups to cancel redundant runs.

---

## Dependencies

Bun is the preferred runtime. The application builds and runs under Node.js, but CI, local development, and deployment scripts target Bun.

### Runtime & Framework Dependencies

| Package | Version | Purpose |
| --- | --- | --- |
| `nuxt` | `^4.4.8` | Full-stack Vue framework with file-based routing, server functions, and Nitro |
| `vue` | `^3.5.39` | Progressive UI library powering the Composition API and reactive frontend |
| `vue-router` | `^4.6.4` | Official client-side router for Vue |
| `drizzle-orm` | `^0.44.7` | Type-safe, SQL-like ORM for SQLite schema modeling and queries |
| `better-sqlite3` | `^12.11.1` | High-performance synchronous SQLite driver for Node.js |
| `zod` | `^4.4.3` | Schema validation for API input, environment parsing, and shared contracts |
| `jose` | `^6.2.3` | Modern JWT, JWS, and JWE implementation for OAuth2 token security |
| `nuxt-auth-utils` | `0.5.25` | Session-based authentication utilities for Nuxt |
| `@nuxt/ui` | `^4.9.0` | Tailwind CSS v4-based component library and design system |
| `@nuxt/fonts` | `^0.14.0` | Local font loading and optimization |
| `@nuxt/eslint` | `1.10.0` | Integrated ESLint for Nuxt projects |
| `@vueuse/core` / `@vueuse/shared` | `^14.3.0` | Essential Vue composition utilities |
| `@vue/shared` | `^3.5.39` | Shared Vue internals and helper functions |
| `@iconify/utils` | `^3.1.3` | Icon rendering utilities used with Nuxt UI icon sets |
| `jdenticon` | `^3.3.0` | Deterministic identicon generation for user avatars |
| `canvas-confetti` | `^1.9.4` | Celebration effects on the frontend dashboard |
| `comark` / `@comark/nuxt` | `^0.4.0` | Markdown rendering and editing for project descriptions |
| `node-html-markdown` | `^2.0.0` | HTML-to-Markdown conversion for chat and Graph content |
| `node-fetch` | `^3.3.2` | Fetch polyfill for outbound server requests |
| `https-proxy-agent` | `^9.1.0` | HTTPS proxy support for Microsoft Graph and outbound OAuth2 calls |
| `openai` | `^6.45.0` | OpenAI-compatible client for DeepSeek chat completions |
| `typescript` | `^5.9.3` | Static type checking across the full stack |
| `eslint` | `^9.39.4` | Core JavaScript and TypeScript linting engine |

### VitePress Documentation Dependencies

The documentation site lives in `documentation/` and uses its own `package.json`:

| Package     | Version   | Purpose                                                 |
| ----------- | --------- | ------------------------------------------------------- |
| `vitepress` | `^1.6.4`  | Static-site generator and documentation framework       |
| `vue`       | `^3.5.34` | Reactive UI library for custom documentation components |

### Key Development Dependencies

| Package | Version | Purpose |
| --- | --- | --- |
| `vitest` | `^4.1.9` | Fast Vite-native test runner used for the 647-test suite |
| `@vitest/coverage-v8` | `^4.1.9` | Code coverage reporting for Vitest |
| `drizzle-kit` | `^0.31.10` | Migration generation and schema management for Drizzle ORM |
| `prettier` | `^3.9.4` | Opinionated code formatting across the entire repository |
| `cross-env` | `^10.1.0` | Cross-platform environment variable setting in npm scripts |
| `@iconify-json/fluent` / `heroicons` / `lucide` / `material-symbols` / `simple-icons` | various | Icon sets consumed by Nuxt UI |
| `@types/better-sqlite3` / `@types/bun` / `@types/canvas-confetti` / `@types/node` | various | TypeScript type definitions |

### Why These Major Dependencies Were Chosen or Updated

- **Nuxt 3 / Vue 3:** Nuxt provides a unified full-stack framework with file-based routing, server API handlers, and deployment presets. Vue 3 delivers the Composition API, better tree-shaking, and improved performance over Vue 2.
- **Drizzle ORM:** Chosen for its lightweight, SQL-centric API and first-class TypeScript inference. It maps cleanly to the existing SQLite schema and lets the team write type-safe queries without a heavy abstraction.
- **better-sqlite3:** Selected for its synchronous, high-performance access to SQLite, which fits the single-node VPS deployment model. The driver is paired with a Bun `bun:sqlite` fallback so the same code runs under either runtime.
- **Zod 4:** Updated to the latest major version for stricter validation, better error messages, and improved performance across API endpoints and shared schemas.
- **jose:** Replaces heavier JWT libraries with a modern, standards-compliant implementation used for OAuth2 access tokens, ID tokens, and session bridging.
- **Vitest:** Replaced the ad-hoc test runner with a Vite-native test framework that understands Nuxt path aliases, supports pool isolation, and integrates cleanly with coverage reporting.

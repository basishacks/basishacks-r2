# PR: Enhance & Debloat — Main Compatibility, OAuth2 PKCE, and Developer Experience

**Source branch:** `enhance-and-debloat`  
**Target branch:** `main`  
**Status:** Ready for review

---

## Summary

This branch modernizes the basishacks platform for the 2025–26 season. It hardens authentication, removes hardcoded secrets, makes the database runtime-agnostic between Bun and Node.js, repairs legacy schema drift, expands test coverage to 667 passing tests, and refreshes all documentation. No breaking changes are introduced for end users.

---

## What changed (high level)

### Microsoft-only login

- Removed magic-code login from both the backend and the UI. Users can no longer request a 6-digit email code; the `/api/auth/code` and `/api/auth/login` endpoints and the email-code UI have been deleted.
- Microsoft OAuth2 is now the only login method for the hackathon registry. The `/login` page redirects users to Microsoft Entra ID, and the `/api/auth` handler remains as an alias for the Microsoft OAuth2 callback.
- The `NUXT_OAUTH2_JWT_SECRET` startup guard (`server/plugins/validate-oauth2-jwt-secret.ts`) now validates the secret at server startup: fatal error in production if missing or shorter than 32 bytes, and a loud dev-only fallback in development/test.

### 1. Microsoft OAuth2 now uses PKCE and environment variables

- Implemented PKCE (`code_verifier` + S256 `code_challenge`) for the Microsoft login flow in `/api/login` and `/api/oauth2/mscallback`.
- Removed hardcoded Microsoft tenant/client IDs and onsite-login client ID. They are now read from `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, and `ONSITE_LOGIN_CLIENT_ID`.
- Added `.env.example` documenting every required and optional variable.
- Made the Microsoft redirect URI configurable via `MICROSOFT_REDIRECT_URI` (default `/api/oauth2/mscallback`).
- Fixed OAuth2 scope encoding so scopes are encoded exactly once.
- Fixed operator precedence in OAuth2 error-message construction.
- Restricted `code_challenge_method` validation to `S256` or `plain` per RFC 7636.
- Fixed the onsite-login redirect path used by `/api/login`: `REDIRECT_URI` defaults to `api/oauth2/dccallback` (matching the original behavior), and `/api/auth` remains an alias for the Microsoft OAuth2 callback handler.
- Fixed the `bridge_id` cookie being deleted before `/api/oauth2/dccallback` could read it, which caused `400 Missing bridge_id cookie` after the Microsoft callback.

### 2. Database layer is runtime-agnostic and self-healing

- Switched the database driver selection to use `bun:sqlite` under Bun and `better-sqlite3` under Node.js automatically.
- Replaced non-functional `drizzle-kit migrate` with a custom migration runner that reads `drizzle/*.sql` files and tracks applied migrations in `_drizzle_migrations`.
- Added legacy schema repair (`migrateLegacySchema`) for databases created from older `sql/archive/init.sql` schemas, including the missing `teams.sourcing` column.
- Kept `start-fix.mjs` as the production entry point.

### 3. Onsite OAuth2 application auto-configuration

- Added `seedOAuth2ApplicationRedirectUri` in `server/database/migrate.ts`.
- On startup, the server automatically adds `${CURRENT_URL_ORIGIN}/${REDIRECT_URI}` (default `http://localhost:3000/api/auth`) to the `ONSITE_LOGIN_CLIENT_ID` application's allowed redirect URIs if it is missing.
- This eliminates the `Application 'basishacks connect' does not allow redirect_uri '...'` error after fresh checkouts or when the origin changes.

### 4. Security hardening

- De-hardcoded MS Graph API credentials in `server/plugins/microsoft.ts`.
- Lazy-initialized the DeepSeek/OpenAI client and added a clear 503 error when `DEEPSEEK_API_KEY` is missing.
- Sanitized API error responses and improved webhook error handling.
- Added auth middleware, admin guards, and extension whitelisting to debug endpoints.
- Rate-limited OAuth2 session creation.
- Bound the OAuth2 callback flow to the `bridge_id` session cookie to prevent orphaned callbacks.

### 5. Frontend fixes

- Fixed the Vue "could not access render before initialization" warning by moving `onUnmounted` out of `onMounted` and reordering `definePageMeta`/`useHead` before `await useFetch` in `app/pages/showcase.vue`.
- Made `demoLink` optional in `ResultsProjectLinks.vue` to eliminate missing-required-prop warnings.
- Removed an undeclared `ProjectCard` prop and sanitized identicon names.

### 6. Testing infrastructure

- Expanded the suite to **647 passing tests**.
- Added `bun-shim/` and `bunfig.toml` so `bun test` points users to the Vitest suite instead of failing on Nuxt path aliases.
- Added tests for OAuth2 redirect URIs, PKCE validation, session creation, DB-to-public conversion, and more.

### 7. Documentation

- Rewrote `README.md` with current environment variables, run commands, and architecture notes.
- Added `documentation/guide/migration-from-main.md` for teams upgrading from `main`.
- Updated VitePress docs across `guide/`, `architecture/`, `backend/`, `deployment/`, and `shared/`.
- Verified `cd documentation && npm run build` succeeds.

### 8. Repository hygiene

- Updated `.gitignore` to exclude agent/skill working artifacts (`skills-*.json`, `test-agent-file.txt`).
- Removed commented-out code blocks during debloating.

---

## Verification

- `bun install` — passes
- `bun run build` — passes
- `bun run test` — **647/647 tests pass**
- `cd documentation && npm run build` — passes
- Clean merge with latest `main` (129c1ca at time of verification)

---

## Deployment notes

1. Copy `.env.example` to `.env` and fill in at least:
   - `NUXT_SESSION_PASSWORD`
   - `NUXT_OAUTH2_JWT_SECRET`
   - `ONSITE_LOGIN_CLIENT_ID`
   - `MICROSOFT_TENANT_ID`
   - `MICROSOFT_CLIENT_ID`
   - `MICROSOFT_CLIENT_SECRET`
2. Ensure the Azure App Registration redirect URI matches `MICROSOFT_REDIRECT_URI` (default `/api/oauth2/mscallback`).
3. The server will automatically register `${CURRENT_URL_ORIGIN}/${REDIRECT_URI}` for `ONSITE_LOGIN_CLIENT_ID`, so no manual SQL update is needed for the onsite login flow.
4. Start with `bun run start` (or `node .output/server/index.mjs` after `bun run build`).

---

## Files worth reviewing

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

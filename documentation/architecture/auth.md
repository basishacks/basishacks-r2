---
title: Authentication and Authorization
description: basis-auth login, local sessions, identity linking, RBAC, and resource-token validation.
---

# Authentication and Authorization

basishacks delegates user authentication to the separately deployed **basis-auth** OpenID Connect provider. It keeps authorization data—local user IDs, roles, team membership, votes, and submissions—in the basishacks SQLite database.

## Browser login

`GET /api/login` performs issuer discovery and starts an authorization-code flow with:

- S256 PKCE
- unpredictable `state` and `nonce`
- OAuth scopes `openid profile email offline_access nethack.access`; feature access comes from JWT permissions
- resource `devconnect://nethack.bisz.dev`
- confidential-client authentication with `client_secret_basic`

The callback is derived rather than configured independently:

```text
${CURRENT_URL_ORIGIN}/api/auth/basis/callback
```

The PKCE verifier, state, nonce, and optional safe relative redirect are kept for at most ten minutes in a dedicated encrypted, HTTP-only, SameSite=Lax session. The callback clears that transaction before exchanging the code, validates the ID token, loads UserInfo, and links the local user. It then writes a deliberately small Nuxt session cookie containing only `{ user: { id } }` and stores the encrypted access/refresh token set in the server-side `basis_auth_sessions` table under that session ID. Keeping permission-rich JWTs out of the cookie prevents browsers from silently dropping an oversized session after the callback.

`POST /api/auth/token` is the only browser bootstrap/refresh endpoint. It resolves the token set from `basis_auth_sessions`, returns an access token, expiry, and a display-only permission list, never a refresh token; it reuses sufficiently fresh access tokens and serializes refresh rotation per session. Rotated tokens are encrypted before being persisted. API routes independently verify bearer tokens. `POST /api/auth/logout` attempts refresh-family revocation and clears both the token row and browser session even when revocation is unavailable.

## Identity linking

The `users` table contains nullable `auth_issuer` and `auth_subject` columns with a unique composite index.

1. A returning identity is resolved by exact issuer and subject.
2. On the first basis-auth login only, a verified email may link to an existing unlinked local user using normalized lowercase comparison.
3. Linking preserves the local integer user ID and all records that reference it.
4. An unverified email, an identity already linked elsewhere, or an email owned by another linked user is rejected.

## Roles and sessions

`nuxt-auth-utils` encrypts the local session cookie, but that cookie does not authorize application APIs. Protected routes require a basis-auth bearer token before applying local authorization:

- `requireUser(event)` loads the local user.
- `requireJudge(event)` permits judges and admins.
- `requireAdmin(event)` permits admins only.

The frontend middleware is a convenience redirect and is never the only authorization check.

## Resource-server tokens

Protected APIs trust basis-auth access tokens only. Validation requires the basis-auth JWKS signature, RS256, the exact configured issuer, audience `devconnect://nethack.bisz.dev`, `typ=at+jwt`, a valid expiry, and basis-schema access-token claims. The subject maps to a local user through the same issuer-and-subject link. Route access is evaluated from the JWT `permissions` array with the shared nethack permission hierarchy.

The client keeps access tokens only in memory, adds the bearer header to protected requests, unwraps `APIResponse.data`, converts failed envelopes with `APIError.from`, and performs one single-flight refresh-and-retry on an expired-token response.

## Retired provider surface

basishacks no longer exposes its native authorization, token, UserInfo, authorization-session, or application-management routes and pages. The legacy `oauth2_applications` table and existing rows remain untouched for audit and rollback. Graph integration is separate and cannot authenticate a basishacks session.

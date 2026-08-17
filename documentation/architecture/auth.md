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
- scopes `openid profile email`
- the configured `BASIS_AUTH_RESOURCE`
- confidential-client authentication with `client_secret_basic`

The callback is derived rather than configured independently:

```text
${CURRENT_URL_ORIGIN}/api/auth/basis/callback
```

The PKCE verifier, state, nonce, and optional safe relative redirect are kept for at most ten minutes in a dedicated encrypted, HTTP-only, SameSite=Lax session. The callback clears that transaction before exchanging the code, validates the ID token, and loads UserInfo. Provider tokens are discarded after the existing `{ user: { id } }` basishacks session is created.

Logout clears only the basishacks session; it does not sign the user out of basis-auth globally.

## Identity linking

The `users` table contains nullable `auth_issuer` and `auth_subject` columns with a unique composite index.

1. A returning identity is resolved by exact issuer and subject.
2. On the first basis-auth login only, a verified email may link to an existing unlinked local user using normalized lowercase comparison.
3. Linking preserves the local integer user ID and all records that reference it.
4. An unverified email, an identity already linked elsewhere, or an email owned by another linked user is rejected.

## Roles and sessions

`nuxt-auth-utils` encrypts the local session cookie. Server-side helpers remain the authorization boundary:

- `requireUser(event)` loads the local user.
- `requireJudge(event)` permits judges and admins.
- `requireAdmin(event)` permits admins only.

The frontend middleware is a convenience redirect and is never the only authorization check.

## Resource-server tokens

APIs wrapped with `withOAuth2JWT()` trust basis-auth access tokens only. Validation requires the basis-auth JWKS signature, RS256, the exact configured issuer, the exact `BASIS_AUTH_RESOURCE` audience, `typ=at+jwt`, a valid expiry, and string `sub`, `client_id`, and `scope` claims. The subject maps to a local user through the same issuer-and-subject link.

## Retired provider surface

basishacks no longer exposes its native authorization, token, UserInfo, authorization-session, or application-management routes and pages. The legacy `oauth2_applications` table and existing rows remain untouched for audit and rollback. Graph integration is separate and cannot authenticate a basishacks session.

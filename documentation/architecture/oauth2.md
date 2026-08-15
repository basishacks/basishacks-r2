---
title: basis-auth Integration
description: OpenID Connect client and resource-server integration with basis-auth.
---

# basis-auth Integration

basishacks is an OpenID Connect confidential client and a protected resource of basis-auth. It is no longer an OAuth provider.

## Registration

Register one confidential client in basis-auth without changing basis-auth source code. Its redirect URI set must contain every deployed callback, for example:

```text
http://localhost:24598/api/auth/basis/callback
https://nethack.biszweb.club/api/auth/basis/callback
```

Register `urn:basis:api:basishacks` as a resource and use the same value for `BASIS_AUTH_RESOURCE`.

## Client configuration

| Variable                   | Purpose                                        |
| -------------------------- | ---------------------------------------------- |
| `BASIS_AUTH_ISSUER`        | Exact issuer used for discovery and validation |
| `BASIS_AUTH_CLIENT_ID`     | basishacks confidential client ID              |
| `BASIS_AUTH_CLIENT_SECRET` | Server-only client secret                      |
| `BASIS_AUTH_RESOURCE`      | Expected resource audience                     |
| `CURRENT_URL_ORIGIN`       | Origin from which the callback URL is derived  |

The client uses discovery, authorization code, S256 PKCE, state, nonce, `client_secret_basic`, ID-token validation, and UserInfo. Secrets and provider tokens are never exposed to the browser.

## Protected API validation

`server/utils/oauth2-jwt.ts` loads the provider JWKS and validates access tokens with exact issuer and audience checks, RS256, access-token type, expiry, scope, and stable subject mapping. It deliberately does not accept legacy basishacks HS256 tokens.

## Legacy data

The retired provider routes and developer application-management pages have been removed. The `oauth2_applications` table is retained as historical data; migrations do not drop it and user deletion detaches rather than removes legacy client records.

---
title: OAuth2 System
description: Full OAuth2 authorization code flow with PKCE support, JWT access tokens, scope management, application lifecycle, and the Microsoft Graph proxy feature.
---

# OAuth2 System

basishacks implements a complete OAuth2 authorization server that supports the **authorization code flow with PKCE**. Third-party and first-party applications can integrate with basishacks to authenticate users and access their data.

## Overview

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌─────────┐
│  Client   │     │  basishacks  │     │  Microsoft   │     │  SQLite  │
│  App      │     │  OAuth2      │     │  Entra ID    │     │   DB     │
└────┬──────┘     └──────┬───────┘     └──────┬───────┘     └────┬────┘
      │  1. /authorize       │                    │                 │
      │ ───────────────────► │                    │                 │
      │                      │  2. Login page     │                 │
      │                      │    (or MS redirect)│                 │
      │                      │ ◄─────────────────►│                 │
      │                      │                    │                 │
      │  3. Redirect back    │                    │                 │
      │    with code         │                    │                 │
      │ ◄─────────────────── │                    │                 │
      │                      │                    │                 │
      │  4. /token           │                    │                 │
      │ ───────────────────► │                    │                 │
      │                      │  5. Verify code,   │                 │
      │                      │     issue JWT      │                 │
      │  6. JWT access token │                    │                 │
      │ ◄─────────────────── │                    │                 │
      │                      │                    │                 │
      │  7. /userinfo        │                    │                 │
      │ ───────────────────► │                    │                 │
      │  8. User claims      │                    │                 │
      │ ◄─────────────────── │                    │                 │
```

### Integration test (token flow)

`tests/api/oauth2/token-flow.test.ts` exercises code → `POST /api/oauth2/token` → UserInfo **in-process** (Vitest + in-memory SQLite). It does **not** open a production backdoor around Microsoft login: the only skip is attaching a seeded user to the in-memory `AuthorizeSession` inside the test (the same state `mscallback` would set). HTTP clients cannot perform that mutation. A session with `user === null` still fails token exchange with `invalid_grant`.

```bash
bun run test -- tests/api/oauth2/token-flow.test.ts
```

## Endpoints

| Endpoint                            | Method | Description                                    |
| ----------------------------------- | ------ | ---------------------------------------------- |
| `/.well-known/openid-configuration` | GET    | OpenID Connect Discovery metadata              |
| `/api/oauth2/authorize`             | GET    | Authorization endpoint (middleware-validated)  |
| `/api/oauth2/session`               | POST   | Create/refresh an authorization session        |
| `/api/oauth2/session`               | GET    | Get current session state                      |
| `/api/oauth2/session`               | DELETE | Cancel an authorization session                |
| `/api/oauth2/token`                 | POST   | Exchange authorization code for JWT            |
| `/api/oauth2/userinfo`              | GET    | OIDC UserInfo endpoint (Bearer token required) |
| `/api/oauth2/to_microsoft`          | POST   | Generate Microsoft OAuth2 redirect link        |
| `/api/oauth2/mscallback`            | GET    | Microsoft OAuth2 callback handler              |
| `/api/oauth2/dccallback`            | GET    | basishacks connect callback handler            |

### OpenID Connect Discovery

Clients can discover the authorization server configuration at:

```
GET /.well-known/openid-configuration
```

The document is built by `buildOpenIdConfiguration()` in `server/utils/openid-configuration.ts` and served from `server/routes/.well-known/openid-configuration.get.ts`.

| Field | Value |
| --- | --- |
| `issuer` | `CURRENT_URL_ORIGIN` (no trailing slash; default `http://localhost:3000`) |
| `authorization_endpoint` | `{issuer}/api/oauth2/authorize` |
| `token_endpoint` | `{issuer}/api/oauth2/token` |
| `userinfo_endpoint` | `{issuer}/api/oauth2/userinfo` |
| `response_types_supported` | `["code"]` |
| `grant_types_supported` | `["authorization_code"]` |
| `code_challenge_methods_supported` | `["S256", "plain"]` |
| `token_endpoint_auth_methods_supported` | `["client_secret_post"]` |
| `scopes_supported` | All keys from `shared/oauth2-scopes.ts` |
| `claims_supported` | `sub`, `name`, `picture`, `email`, `email_verified` |

**Not advertised** (not implemented): `jwks_uri` (access tokens use HS256 with a shared secret), introspection, revocation, dynamic client registration, refresh tokens, or ID token issuance. The `openid` scope still enables UserInfo `sub` claims; no separate `id_token` is returned from the token endpoint.

## Authorization Flow

### Step 1: Authorization request

The client redirects the user to `/api/oauth2/authorize` with standard OAuth2 parameters:

| Parameter               | Required   | Description                                 |
| ----------------------- | ---------- | ------------------------------------------- |
| `client_id`             | Yes        | Application client ID                       |
| `scope`                 | Yes        | Space-separated requested scopes            |
| `redirect_uri`          | Yes        | Must match a registered redirect URI        |
| `state`                 | Yes        | Client-provided anti-CSRF token             |
| `response_type`         | Yes        | Must be `code`                              |
| `code_challenge`        | Yes (PKCE) | SHA-256 hash of the code verifier           |
| `code_challenge_method` | Yes (PKCE) | Must be `S256` only (see enforcement below) |

The `oauth2-authorize.ts` middleware validates the request, creates an `AuthorizeSession`, and sets a `bridge_id` cookie.

::: danger PKCE enforcement PKCE is **mandatory** with `code_challenge_method=S256` only. Per RFC 7636 §4.4.2, the `plain` method provides no additional security over the implicit flow and is therefore rejected at the validation layer. Requests with `plain` or missing PKCE receive:

```
invalid_request: code_challenge_method must be S256
```

:::

### Step 2: User authentication

The user authenticates through one of:

- **Microsoft OAuth2**: Redirect to Microsoft Entra ID (the only login method for the hackathon registry). The authorize middleware generates a random `state` and PKCE `code_verifier`, stores them in the session, and redirects to Microsoft with `response_type=code`, `code_challenge`, `code_challenge_method=S256`, and `state`.
- **basishacks connect**: Internal first-party OAuth2 flow, initiated by `/api/login` with its own PKCE verifier cookie.

### Step 3: Consent and code generation

After authentication, if the requested scopes include sensitive scopes, the user must explicitly consent. For non-sensitive scopes with trusted apps, consent may be skipped.

Upon consent, an authorization code is generated:

```ts
export function generateExchangeCode(session: AuthorizeSession) {
    const code = randomBytes(128).toString("base64url");
    session.code = code;
}
```

The user is redirected back to the client's `redirect_uri` with `code` and `state` parameters.

### Step 4: Token exchange

The client exchanges the authorization code for a JWT access token:

```
POST /api/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=<authorization_code>
&client_id=<client_id>
&client_secret=<client_secret>
&redirect_uri=<redirect_uri>
&code_verifier=<code_verifier>   (for PKCE)
```

The token endpoint validates:

1. `client_id` exists in the database
2. `client_secret` matches (SHA-256 hash comparison)
3. `redirect_uri` is registered for the application (validated against stored redirect URIs)
4. Authorization code is valid and not expired
5. PKCE `code_verifier` matches the original `code_challenge` (S256 only)

#### Unified error responses

All token endpoint failures return a generic `invalid_grant` error with a minimal message to prevent information disclosure about which specific validation failed:

```json
{ "error": "invalid_grant", "error_description": "Failed to exchange authorization code" }
```

Client authentication failures (`client_id` not found or `client_secret` mismatch) return `invalid_client`:

```json
{ "error": "invalid_client", "error_description": "Invalid client credentials" }
```

#### Redirect URI validation in token endpoint

When `redirect_uri` is provided in the token request, it is validated against the application's registered redirect URIs. The validation uses an exact string match against the space-separated `redirect_uris` stored on the application. If the provided redirect URI is not in the allowed list, the endpoint returns `invalid_grant`.

### Step 5: JWT issuance

#### Authorization code single-use guarantee

Per RFC 6749 §4.1.2, authorization codes are invalidated **immediately** on use, before any asynchronous operation that could allow a race condition:

```ts
// Invalidate IMMEDIATELY before any await to prevent double exchange (RFC 6749 §4.1.2)
session.code = null;
completeAuthorizeSession(session.token);
```

The session store entry is deleted entirely after successful exchange. Any subsequent attempt to use the same authorization code will fail because `session.code` is already `null` and the session no longer exists in the store.

On successful exchange, a JWT is issued using the `jose` library:

```ts
const jwt = await new SignJWT({
    sub: String(session.user.id),
    user_id: session.user.id,
    client_id: session.application.client_id,
    redirect_uri: session.redirect_uri,
    scope: session.scopes.join(" "),
})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(getOAuth2Issuer()) // CURRENT_URL_ORIGIN
    .setAudience(session.application.client_id)
    .setIssuedAt(Date.now())
    .setExpirationTime("1h")
    .sign(key);
```

| JWT Claim      | Value                                      |
| -------------- | ------------------------------------------ |
| `sub`          | User ID (string)                           |
| `user_id`      | User ID (number)                           |
| `client_id`    | Application client ID                      |
| `redirect_uri` | Original redirect URI                      |
| `scope`        | Granted scopes                             |
| `iss`          | `getOAuth2Issuer()` (`CURRENT_URL_ORIGIN`) |
| `aud`          | Application client ID                      |
| `exp`          | 1 hour from issuance                       |

The JWT is signed with `NUXT_OAUTH2_JWT_SECRET` using HS256. The `iss` claim matches the OpenID Discovery `issuer` field.

## Scope System

Scopes are defined in `shared/oauth2-scopes.ts` as a single source of truth:

| Scope | Description | Admin Only | Sensitive |
| --- | --- | --- | --- |
| `openid` | Access basic OpenID Connect identity information | No | No |
| `profile` | Access user profile information (name, picture, etc.) | No | No |
| `email` | Access user's email address | No | No |
| `meetings.read.application` | Read meetings bound to this application | No | No |
| `meetings.read.all` | Read all meetings of the user | Yes | Yes |
| `meetings.readwrite.application` | Read and write meetings bound to this application | No | No |
| `meetings.readwrite.all` | Read and write all meetings | Yes | Yes |
| `chat.read` | Read Microsoft Teams chat | No | Yes |

::: tip Adding a new scope only requires adding an entry to `OAuth2Scopes` in `shared/oauth2-scopes.ts`. It automatically propagates to validation, API responses, and the UI picker modal. :::

### Scope validation

When an authorization request is made, the requested scopes are validated against the application's configured permissions:

```ts
// server/utils/oauth2-validate.ts
const allowedScopes = app.permissions.split(" ").filter((s) => s);
const unauthorizedScopes = requestedScopes.filter((scope) => !allowedScopes.includes(scope));
```

### Sensitive scopes

Scopes marked as `sensitive: true` require explicit user consent during the authorization flow. The `usedSensitiveScopes()` helper determines whether to show the consent screen.

### Admin-only scopes

Scopes marked as `adminOnly: true` can only be assigned to applications by administrators.

## Application Management

### Creating an application

Applications are created via the API with a randomly generated `client_id` (UUID):

```ts
const client_id = crypto.randomUUID();
```

Each user is limited to **2 applications** (`MAX_APPLICATIONS_PER_USER`).

### Application types

| Type    | Description                                                    |
| ------- | -------------------------------------------------------------- |
| `first` | First-party application (internal, such as basishacks connect) |
| `third` | Third-party application                                        |

### Secret management

Client secrets are **SHA-256 hashed** before storage. Multiple secrets can be stored as space-separated hashes:

```ts
// Adding a secret
const plainSecret = randomBytes(32).toString("hex");
const secretHash = createHash("sha256").update(plainSecret).digest("hex");
// Stored as: "hash1 hash2 hash3"
```

Secrets are displayed in abbreviated form: `sha256:abc12345...xyz67890`

### Redirect URI management

Redirect URIs are stored as space-separated strings and managed through dedicated API endpoints:

```ts
// Add a redirect URI
addOAuth2ApplicationRedirectUri(event, clientID, uri);

// Remove a redirect URI
removeOAuth2ApplicationRedirectUri(event, clientID, uri);
```

::: warning Redirect URIs must match exactly during the authorization flow. No pattern matching or wildcard support is provided. :::

## Microsoft OAuth2 Login

The hackathon registry uses Microsoft Entra ID as its sole identity provider. The flow is hardened with state validation and PKCE:

1. **Authorize request** — `/api/oauth2/authorize` (via middleware) creates an `AuthorizeSession` containing a random `ms_state` and PKCE `ms_verifier`.
2. **Redirect to Microsoft** — `POST /api/oauth2/to_microsoft` or the authorize middleware redirects the user to `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize` with `response_type=code`, `code_challenge=SHA256(ms_verifier)`, `code_challenge_method=S256`, and `state=ms_state`.
3. **Callback** — Microsoft redirects to `/api/oauth2/mscallback` with `code`, `state`, and optionally `session_state`.
4. **Validation** — The handler requires the `bridge_id` cookie, verifies the returned `state` matches `session.ms_state`, and ensures `session.ms_verifier` exists.
5. **Token exchange** — The handler sends the code and original `code_verifier` to Microsoft's token endpoint, authenticated with `MICROSOFT_CLIENT_SECRET`.
6. **User provisioning** — The Microsoft ID token is decoded to obtain `email` and `name`; `createUserFromMicrosoftProfile` creates or updates the local user record.
7. **Flow completion** — The user is attached to the session and redirected to the consent page (if sensitive scopes are requested) or directly to the application's redirect URI.

The `/api/auth` endpoint is an alias for `/api/oauth2/mscallback`, registered to accommodate Azure App Registration redirect URIs that point to `/api/auth`.

## Microsoft Graph Proxy

Applications with `proxy_microsoft = 1` can proxy Microsoft Graph API calls through basishacks. When such an application initiates the authorization flow:

1. The `oauth2-authorize.ts` middleware detects `proxy_microsoft` on the application
2. Instead of showing the basishacks login page, it immediately redirects to Microsoft OAuth2
3. The Microsoft callback handler (`mscallback.get.ts`) completes the Microsoft authentication
4. The basishacks session is created with the Microsoft user's identity

This allows external applications to leverage basishacks as a proxy for Microsoft Graph API access without implementing their own Microsoft OAuth2 flow.

## basishacks connect

`basishacks connect` is the internal first-party OAuth2 application, seeded during initialization. Its `client_id` is read from the `ONSITE_LOGIN_CLIENT_ID` environment variable:

| Property | Value |
| --- | --- |
| `client_id` | Value of `ONSITE_LOGIN_CLIENT_ID` |
| `permissions` | `openid profile email` |
| `redirect_uri` | `${CURRENT_URL_ORIGIN}${REDIRECT_URI}` (default `http://localhost:3000/api/oauth2/dccallback`) |
| `type` | `first` |
| `proxy_microsoft` | `0` |

This application is used for site login. The full onsite login path is:

```
/api/login → /api/oauth2/authorize → Microsoft OAuth2 → /api/oauth2/mscallback → /api/oauth2/dccallback
```

Because hackathon accounts are backed by Microsoft Entra ID, the authorize step ultimately delegates authentication to Microsoft before returning to the basishacks callback.

### Onsite login PKCE flow

The onsite login (`server/api/login.get.ts`) initiates a full OAuth2 + PKCE flow against basishacks itself. `constructOnSiteLoginURL`:

1. Generates a `code_verifier` (random 32 bytes, base64url)
2. Computes `code_challenge = SHA-256(code_verifier)` (base64url)
3. Includes `code_challenge` and `code_challenge_method=S256` in the authorize URL
4. Sets a `pkce_verifier` cookie containing the `code_verifier` (httpOnly, secure, sameSite lax, 10-minute maxAge)

The authorize middleware stores the `code_challenge` in `session.bh_verifier_challenge`. When the OAuth2 flow completes, `server/api/oauth2/dccallback.get.ts` follows the **same logical steps as an external OIDC client**, using shared server helpers (no self-HTTP):

1. Validate `state` and read `pkce_verifier` (not `session.ms_verifier`)
2. **Token** — `redeemAuthorizationCodeForToken()` in `server/utils/oauth2-token.ts` (same core path as `POST /api/oauth2/token` after client authentication)
3. **UserInfo** — `resolveUserInfoFromAccessToken()` in `server/utils/oauth2-userinfo.ts` (same claims as `GET /api/oauth2/userinfo`)
4. `setUserSession({ user: { id } })` from UserInfo `sub`, then redirect (`post_login_redirect` or `/dashboard`)

External clients still call the HTTP endpoints only:

| Step | External client | Onsite (`dccallback`) |
| --- | --- | --- |
| Token | `POST /api/oauth2/token` + `client_secret` | `redeemAuthorizationCodeForToken` (client bound via `bridge_id` + cookies) |
| UserInfo | `GET /api/oauth2/userinfo` Bearer token | `resolveUserInfoFromAccessToken` in-process |

::: warning Verifier selection The `pkce_verifier` cookie (basishacks flow) must not be confused with `session.ms_verifier`, which is the PKCE verifier for the Microsoft proxy flow (basishacks → Microsoft). The `dccallback` endpoint uses the cookie value, never `session.ms_verifier`. :::

## JWT Validation at Startup

The `NUXT_OAUTH2_JWT_SECRET` environment variable is validated at server startup by the `validate-environment.ts` Nitro plugin:

- Must be at least **32 bytes** (UTF-8 encoded length).
- If missing or too short in **production**, the process exits with a fatal error.
- In **development/test**, a warning is logged but the server continues (using the `DEV_OAUTH2_JWT_SECRET_FALLBACK` from `validate-oauth2-jwt-secret.ts`).

This ensures that all OAuth2 tokens are signed with a strong key before any requests are processed.

## JWT Verification Middleware

The `withOAuth2JWT()` wrapper in `server/utils/oauth2-jwt.ts` protects API endpoints that require OAuth2 Bearer tokens:

```ts
export default withOAuth2JWT(
    async (event) => {
        const { payload, scopes, user } = event.context.oauth2!;
        return { sub: user!.id };
    },
    { requiredScopes: ["profile"], loadUser: true },
);
```

### Options

| Option           | Type       | Default | Description                      |
| ---------------- | ---------- | ------- | -------------------------------- |
| `requiredScopes` | `string[]` | `[]`    | Scopes the token must include    |
| `loadUser`       | `boolean`  | `false` | Whether to fetch the DB user row |

### Context attachment

When `withOAuth2JWT()` is used, it attaches an `OAuth2JWTContext` to `event.context.oauth2`:

```ts
interface OAuth2JWTContext {
    payload: OAuth2JWTPayload; // Decoded JWT claims
    scopes: string[]; // Parsed scope array
    user?: User; // DB user row (if loadUser: true)
}
```

### UserInfo endpoint example

The `/api/oauth2/userinfo` endpoint uses `withOAuth2JWT` plus shared `buildUserInfoClaims()`:

```ts
export default withOAuth2JWT(
    async (event) => {
        const { scopes, user } = event.context.oauth2!;
        return buildUserInfoClaims(user!, scopes);
    },
    { loadUser: true },
);
```

## Authorization Session Store

### Session cookie hardening

The `bridge_id` cookie that links the user's browser to their authorization session uses hardened security flags:

| Property   | Value      |
| ---------- | ---------- |
| `httpOnly` | `true`     |
| `secure`   | `true`     |
| `sameSite` | `lax`      |
| `maxAge`   | 10 minutes |

The `bridge_error` cookie (used to surface validation errors in the authorize page UI) uses the same hardened flags. Both cookies are deleted on flow completion.

### Authorization Session Store

Authorization sessions are stored in-memory using a plain object:

```ts
const AUTHORIZE_SESSION_STORE: Record<string, AuthorizeSession> = {};
```

Each session has a 10-minute expiry and tracks the full authorization state:

| Field                          | Description                                               |
| ------------------------------ | --------------------------------------------------------- |
| `token`                        | Session identifier (set as `bridge_id` cookie)            |
| `application`                  | The OAuth2 application requesting access                  |
| `user`                         | Authenticated user (null until login completes)           |
| `scopes`                       | Requested scopes                                          |
| `login_state`                  | `identification` → `requesting` → `consent` → `completed` |
| `code`                         | Authorization code (generated at consent)                 |
| `bh_state`                     | OAuth2 `state` parameter returned to the client           |
| `bh_verifier_challenge`        | PKCE code challenge (S256)                                |
| `bh_verifier_challenge_method` | PKCE method (always `S256`)                               |
| `ms_state`                     | Microsoft OAuth2 `state` parameter (proxy flows only)     |
| `ms_verifier`                  | Microsoft PKCE code verifier (proxy flows only)           |
| `teams_code`                   | Teams join code (legacy field, currently unused)          |
| `post_login_redirect`          | Optional internal redirect after flow completion          |
| `granted_time`                 | Session creation timestamp                                |
| `expire_time`                  | Session expiry timestamp                                  |

::: warning The in-memory session store means authorization sessions are lost on server restart. This is acceptable because sessions are short-lived (10 minutes), but it means the OAuth2 flow cannot span server restarts. :::

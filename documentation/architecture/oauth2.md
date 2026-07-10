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

## Endpoints

| Endpoint                   | Method | Description                                    |
| -------------------------- | ------ | ---------------------------------------------- |
| `/api/oauth2/authorize`    | GET    | Authorization endpoint (middleware-validated)  |
| `/api/oauth2/session`      | POST   | Create/refresh an authorization session        |
| `/api/oauth2/session`      | GET    | Get current session state                      |
| `/api/oauth2/session`      | DELETE | Cancel an authorization session                |
| `/api/oauth2/token`        | POST   | Exchange authorization code for JWT            |
| `/api/oauth2/userinfo`     | GET    | OIDC UserInfo endpoint (Bearer token required) |
| `/api/oauth2/to_microsoft` | POST   | Generate Microsoft OAuth2 redirect link        |
| `/api/oauth2/mscallback`   | GET    | Microsoft OAuth2 callback handler              |
| `/api/oauth2/dccallback`   | GET    | basishacks connect callback handler            |

## Authorization Flow

### Step 1: Authorization request

The client redirects the user to `/api/oauth2/authorize` with standard OAuth2 parameters:

| Parameter               | Required   | Description                              |
| ----------------------- | ---------- | ---------------------------------------- |
| `client_id`             | Yes        | Application client ID                    |
| `scope`                 | Yes        | Space-separated requested scopes         |
| `redirect_uri`          | Yes        | Must match a registered redirect URI     |
| `state`                 | Yes        | Client-provided anti-CSRF token          |
| `response_type`         | Yes        | Must be `code`                           |
| `code_challenge`        | Yes (PKCE) | SHA-256 hash of the code verifier        |
| `code_challenge_method` | Yes (PKCE) | Must be `S256` or `plain` (per RFC 7636) |

The `oauth2-authorize.ts` middleware validates the request, creates an `AuthorizeSession`, and sets a `bridge_id` cookie.

### Step 2: User authentication

The user authenticates through one of:

- **Microsoft OAuth2**: Redirect to Microsoft Entra ID (the only login method for the hackathon registry)
- **basishacks connect**: Internal first-party OAuth2 flow

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
3. `redirect_uri` is registered for the application
4. Authorization code is valid and not expired
5. PKCE `code_verifier` matches the original `code_challenge` (if PKCE was used)

### Step 5: JWT issuance

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
    .setIssuer("basishacks")
    .setAudience(session.application.client_id)
    .setIssuedAt(Date.now())
    .setExpirationTime("1h")
    .sign(key);
```

| JWT Claim      | Value                 |
| -------------- | --------------------- |
| `sub`          | User ID (string)      |
| `user_id`      | User ID (number)      |
| `client_id`    | Application client ID |
| `redirect_uri` | Original redirect URI |
| `scope`        | Granted scopes        |
| `iss`          | `basishacks`          |
| `aud`          | Application client ID |
| `exp`          | 1 hour from issuance  |

The JWT is signed with `NUXT_OAUTH2_JWT_SECRET` using HS256.

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

This application is used for site login via the custom OAuth2 flow.

### Onsite login PKCE flow

The onsite login (`server/api/login.get.ts`) initiates a full OAuth2 + PKCE flow against basishacks itself. `constructOnSiteLoginURL`:

1. Generates a `code_verifier` (random 32 bytes, base64url)
2. Computes `code_challenge = SHA-256(code_verifier)` (base64url)
3. Includes `code_challenge` and `code_challenge_method=S256` in the authorize URL
4. Sets a `pkce_verifier` cookie containing the `code_verifier` (httpOnly, secure, sameSite lax, 10-minute maxAge)

The authorize middleware stores the `code_challenge` in `session.bh_verifier_challenge`. When the OAuth2 flow completes, the callback at `server/api/oauth2/dccallback.get.ts` reads the `pkce_verifier` cookie and passes it as the `code_verifier` to `exchangeAuthorizationCode`, which verifies it hashes (S256) to `session.bh_verifier_challenge`. The cookie is cleared immediately after the exchange.

::: warning Verifier selection The `pkce_verifier` cookie (basishacks flow) must not be confused with `session.ms_verifier`, which is the PKCE verifier for the Microsoft proxy flow (basishacks → Microsoft). The `dccallback` endpoint uses the cookie value, never `session.ms_verifier`. :::

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

The `/api/oauth2/userinfo` endpoint demonstrates the wrapper in action:

```ts
export default withOAuth2JWT(
    async (event) => {
        const { scopes, user } = event.context.oauth2!;
        const claims: Record<string, any> = { sub: String(user!.id) };

        if (scopes.includes("profile")) {
            claims.name = user!.name;
            claims.picture = user!.profile_picture;
        }

        if (scopes.includes("email")) {
            claims.email = user!.email;
            claims.email_verified = true;
        }

        return claims;
    },
    { loadUser: true },
);
```

## Authorization Session Store

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
| `bh_verifier_challenge`        | PKCE code challenge                                       |
| `bh_verifier_challenge_method` | PKCE method (`S256` or `plain`)                           |
| `ms_state`                     | Microsoft OAuth2 `state` parameter (proxy flows only)     |
| `ms_verifier`                  | Microsoft PKCE code verifier (proxy flows only)           |
| `teams_code`                   | Teams join code (legacy field, currently unused)          |
| `post_login_redirect`          | Optional internal redirect after flow completion          |
| `granted_time`                 | Session creation timestamp                                |
| `expire_time`                  | Session expiry timestamp                                  |

::: warning The in-memory session store means authorization sessions are lost on server restart. This is acceptable because sessions are short-lived (10 minutes), but it means the OAuth2 flow cannot span server restarts. :::

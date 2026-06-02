# OAuth2 System

basishacks implements a complete **OAuth2 Authorization Server** that supports the Authorization Code flow with PKCE.

## Architecture

```
┌──────────┐     ┌──────────────────┐     ┌──────────────┐
│  Client   │     │  basishacks      │     │  Microsoft   │
│  App      │     │  OAuth2 Server   │     │  Entra ID    │
│           │     │                  │     │              │
│  1. Auth  │────►│  /authorize      │     │              │
│  Request  │     │                  │     │              │
│           │     │  2. Show login   │     │              │
│           │◄────│  page            │     │              │
│           │     │                  │     │              │
│           │     │  3. User logs    │────►│  /authorize  │
│           │     │  in via MS       │     │              │
│           │     │                  │◄────│  code        │
│           │     │  4. MS callback  │     │              │
│           │     │                  │     │              │
│           │◄────│  5. Redirect     │     │              │
│  code +   │     │  with code+state │     │              │
│  state    │     │                  │     │              │
│           │     │                  │     │              │
│  6. Token │────►│  /token          │     │              │
│  Request  │     │                  │     │              │
│           │◄────│  JWT access      │     │              │
│           │     │  token           │     │              │
│           │     │                  │     │              │
│  7. API   │────►│  /userinfo       │     │              │
│  Request  │     │  (Bearer token)  │     │              │
│           │◄────│  User claims     │     │              │
└──────────┘     └──────────────────┘     └──────────────┘
```

## Authorization Flow

### Step 1: Authorization Request

The client redirects the user to:

```
GET /api/oauth2/authorize?
  client_id=<uuid>&
  response_type=code&
  redirect_uri=<uri>&
  scope=openid profile email&
  state=<random>&
  code_challenge=<sha256>&
  code_challenge_method=S256
```

The `oauth2-authorize` middleware validates the request and creates an `AuthorizeSession`.

### Step 2: User Login

The authorization page (`app/pages/api/oauth2/authorize.vue`) presents two login methods:

1. **Magic code** — email + 6-digit code
2. **Microsoft OAuth2** — redirects to Microsoft Entra ID

For **first-party** applications, the consent screen is skipped.
For **third-party** applications, a consent screen is shown after login.

### Step 3: Authorization Code Generation

After successful login and consent, the server generates an authorization code and redirects to:

```
<redirect_uri>?code=<exchange_code>&state=<bh_state>
```

### Step 4: Token Exchange

The client exchanges the authorization code for a JWT access token:

```
POST /api/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=<exchange_code>&
client_id=<uuid>&
client_secret=<secret>&
redirect_uri=<uri>&
code_verifier=<pkce_verifier>
```

Response:

```json
{
  "access_token": "<jwt>",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### Step 5: Access Protected Resources

```
GET /api/oauth2/userinfo
Authorization: Bearer <jwt>
```

Response (scope-dependent):

```json
{
  "sub": "42",
  "name": "John Doe",
  "picture": "/assets/users/john.png",
  "email": "john@basischina.com",
  "email_verified": true
}
```

## Authorize Session

The `AuthorizeSession` object tracks the state of an authorization request:

| Field | Type | Description |
|-------|------|-------------|
| `token` | string | Session identifier (stored in `bridge_id` cookie) |
| `redirect_uri` | string | Client's redirect URI |
| `application` | OAuth2Application | The client application |
| `user` | User \| null | Authenticated user (set after login) |
| `code` | string \| null | Generated authorization code |
| `ms_state` | string \| null | Microsoft OAuth2 state parameter |
| `ms_verifier` | string \| null | Microsoft PKCE verifier |
| `bh_state` | string | Client's state parameter (passed through) |
| `bh_verifier_challenge` | string | Client's PKCE challenge |
| `expire_time` | number | Session expiry (10 minutes) |

Sessions are stored in-memory (`AUTHORIZE_SESSION_STORE`) and expire after 10 minutes.

## OAuth2 Application Management

### Creating Applications

```typescript
POST /api/applications
Body: {
  name: "My App",
  description: "A cool app",
  proxy_microsoft: false,
  type: "third"
}
```

Maximum 2 applications per user (`MAX_APPLICATIONS_PER_USER = 2`).

### Client Secrets

- Secrets are generated as random 32-byte strings
- Stored as SHA-256 hashes (space-separated in `client_secret` column)
- The plain-text secret is only shown once at creation time
- Displayed in abbreviated form: `sha256:abcdef01...mnopqrst`
- Validation supports both SHA-256 hashed and legacy plaintext secrets

### Redirect URIs

- Stored as space-separated values in `redirect_uris` column
- Must start with `https://` or `http://localhost`
- Validated during authorization requests

### Scope Permissions

Scopes are defined in `shared/oauth2-scopes.ts`:

| Scope | Description | Admin Only |
|-------|-------------|------------|
| `openid` | Basic OpenID Connect identity | No |
| `profile` | User profile information | No |
| `email` | User email address | No |
| `offline_access` | Maintain granted access | No |
| `meetings.read.application` | Read app-generated meetings | No |
| `meetings.read.all` | Read all meetings | Yes |
| `meetings.readwrite.application` | Read/write app meetings | No |
| `meetings.readwrite.all` | Read/write all meetings | Yes |

## JWT Token System

Access tokens are JWTs signed with `HS256` using `NUXT_OAUTH2_JWT_SECRET`:

```typescript
// Token payload
{
  sub: "<user_id>",
  user_id: <number>,
  client_id: "<application_client_id>",
  redirect_uri: "<redirect_uri>",
  scope: "openid profile email"
}
```

### JWT Validation Helpers

```typescript
import { withOAuth2JWT, verifyOAuth2JWT, verifyAccessToken } from '~/server/utils/oauth2-jwt'

// High-level wrapper for API handlers
export default withOAuth2JWT(async (event) => {
  const { payload, scopes, user } = event.context.oauth2
  return { sub: user.id }
}, { requiredScopes: ['profile'], loadUser: true })

// Mid-level: verify JWT from request
const payload = await verifyOAuth2JWT(event)

// Low-level: verify raw JWT string
const payload = await verifyAccessToken(tokenString)
```

## Microsoft Proxy Mode

Applications with `proxy_microsoft = 1` skip the basishacks login page and redirect directly to Microsoft OAuth2. This is useful for applications that need Microsoft authentication without the basishacks consent flow.

When a proxy application hits `/api/oauth2/authorize`, the middleware immediately redirects to the Microsoft authorization URL instead of showing the login page.

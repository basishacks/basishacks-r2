# Project Overview

## Directory Structure

```
basishacks-r2/
├── app/                    # Nuxt app (Vue frontend)
│   ├── assets/css/         # Global styles (Tailwind + custom utilities)
│   ├── components/         # Vue components (18 components)
│   ├── composables/        # Composables (useApiUser)
│   ├── layouts/            # Nuxt layouts (6 layouts)
│   ├── middleware/          # Route middleware (auth.ts)
│   ├── pages/              # File-based routing (23 pages)
│   └── utils/              # Frontend utilities (consts, errors, loading)
├── server/                 # Nitro backend
│   ├── api/                # API route handlers (54 endpoints)
│   ├── middleware/          # Server middleware (OAuth2 authorize)
│   ├── plugins/            # Nitro plugins (DB init, MS Graph, seed)
│   ├── types/              # Type augmentations
│   └── utils/              # Server utilities (13 utility modules)
│       └── database/       # Per-table DB helpers (7 modules)
├── shared/                 # Code shared between client and server
│   ├── schemas.ts          # Zod schemas for API input validation
│   ├── database.d.ts       # TypeScript types matching DB schema
│   ├── responses.d.ts      # API response interface definitions
│   ├── auth.d.ts           # Session type augmentation
│   ├── oauth2.ts           # Microsoft OAuth2 static config
│   ├── oauth2-scopes.ts    # OAuth2 scope definitions and helpers
│   ├── permissions.ts      # Permission constants and helpers
│   └── rubric.ts           # Judging rubric definitions
├── sql/                    # Schema and migrations
│   ├── init.sql            # Base schema
│   ├── migration-*.sql     # Dated migrations
│   └── patch-*.sql         # Feature patches
├── tests/                  # Test suite
├── public/                 # Static assets
├── documentation/          # VitePress documentation site
└── scripts/                # Build scripts
```

## Key Features

### Hackathon Lifecycle

The platform manages a complete hackathon lifecycle through the `hackathon` table (single row, `id = 1`):

| Status | Description |
|--------|-------------|
| `not_started` | Before the event — users can create teams |
| `in_progress` | During the event — teams can edit and submit projects |
| `voting` | After the event — peer voting and judge scoring |
| `finished` | Event completed — results are published |
| `paused` | Event paused for maintenance |

### Team Management

- Users create teams with a name (2–30 characters)
- Team members are added by `@basischina.com` email
- Teams select a pathway: **junior** or **senior**
- Each pathway has different rubric weightings for judging

### Project Submission

Teams submit their projects with:
- Project name (required)
- Description (minimum 30 characters)
- Demo URL (required, must be a valid URL)
- Repository URL (required, must be a valid URL)
- Pathway selection (junior or senior)

Submissions are only accepted while the hackathon status is `not_started` or `in_progress`.

### Peer Voting

- Each participant with a submitted project receives a ballot with 4 random projects from the same pathway
- Participants distribute exactly **12 stars** among the 4 projects (1–5 stars each)
- A reasoning text (30–2000 characters) is required
- Voting is one-shot: once submitted, it cannot be changed

### Judge Scoring

- Judges use rubric criteria defined in `shared/rubric.ts`
- Each criterion is scored 0–5
- A reasoning text (10–2000 characters) is required
- Each judge can only score a team once
- Final scores are calculated as: **25% peer voting + 75% judge scores**

### Rubric System

The rubric differs by pathway:

**Junior Pathway:**

| Criterion | Abbr | Weight |
|-----------|------|--------|
| Innovation & Originality | ORG | 30% |
| Presentation & Design | PRE | 25% |
| Technical Complexity | TEC | 20% |
| Theme Alignment | THM | 15% |
| Impact & Usefulness | IMP | 10% |

**Senior Pathway:**

| Criterion | Abbr | Weight |
|-----------|------|--------|
| Impact & Usefulness | IMP | 30% |
| Presentation & Design | PRE | 25% |
| Technical Complexity | TEC | 20% |
| Theme Alignment | THM | 15% |
| Innovation & Originality | ORG | 10% |

### OAuth2 Integration

The platform implements a full OAuth2 authorization server:

- **Authorization Code flow** with PKCE support
- **Application management** — create, configure, and delete OAuth2 applications
- **Client secrets** — SHA-256 hashed storage, abbreviated display, one-time plain-text reveal
- **Redirect URI validation** — whitelist-based, must start with `https://` or `http://localhost`
- **Scope management** — fine-grained permission scopes with admin-only restrictions
- **Token endpoint** — exchanges authorization codes for JWT access tokens
- **UserInfo endpoint** — returns claims based on granted scopes

### Developer Portal

A permission-gated admin interface at `/developers` providing:

- User management table with filtering, sorting, and bulk delete
- Team management table with pathway badges and submission status
- OAuth2 application management with secrets, URIs, and scopes
- File upload and asset management
- DeepSeek AI chat session management
- Permission-based access control using a dot-notation system (e.g., `portal.users.view`)

### Microsoft Graph Integration

- **Application-level access** — client credentials flow for creating meetings and managing webhooks
- **Delegated access** — ROPC flow for a dummy user to send Teams chat messages
- **Webhook subscriptions** — real-time notifications for chat messages with lifecycle management
- **Meeting creation** — automated calendar event creation with attendees

## Code Style

- **Prettier** config (`.prettierrc`): no semicolons, single quotes
- **ESLint** configured via `@nuxt/eslint` (`eslint.config.mjs`)
- Prefer `const` and arrow functions where appropriate
- Use `~~/` for imports from the project root (especially in server code)
- No comments unless explicitly requested

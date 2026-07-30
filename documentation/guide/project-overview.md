---
title: Project Overview
description: High-level overview of the basishacks hackathon platform, including features, technology stack, directory structure, and key concepts.
---

# Project Overview

**basishacks** is the official website for the **BIBS-C Network Hackathon** (season 2, 2025–26). It is a full-stack Nuxt 4 application that serves as the central platform for organizing and running the hackathon event.

## What basishacks Does

The platform manages the entire hackathon lifecycle:

| Feature | Description |
| --- | --- |
| **Hackathon Management & Scheduling** | Control event state (`not_started`, `in_progress`, `voting`, `finished`, `paused`), schedule start and end times, and manage the event timeline. |
| **Team Creation & Management** | Participants create teams, invite members via `@basischina.com` email, and manage team membership. |
| **Project Submission** | Teams submit projects with name, description, demo URL, repository URL, and sourcing information. Submissions are accepted only during `not_started` or `in_progress` states. |
| **Peer Voting** | Participants vote on projects by distributing 10 stars across eligible projects in the same pathway. The total must equal exactly 10. |
| **Judge Scoring** | Judges score projects using a weighted rubric system with criteria scored 0–5 per criterion. Separate rubrics are used for junior and senior pathways. |
| **OAuth2 Application Integrations** | Full OAuth2 2.0/2.1 authorization server with PKCE support, allowing third-party and first-party applications to integrate with the platform. |
| **Developer Portal** | Administrative dashboard for managing OAuth2 applications, users, teams, seasons, and debug tools. |
| **Microsoft Graph API** | Integration with Microsoft Entra ID for OAuth2 login, meeting scheduling, and Teams chat via the Graph API. |
| **DeepSeek AI Chatbot** | In-memory chat session store powered by the OpenAI SDK for DeepSeek AI interactions in debug routes. |
| **SafeLink / SafeComark Components** | Client-side components that sanitize user-provided links and markdown content, preventing XSS and open redirects in rendered project descriptions. |
| **Security Middleware** | A middleware pipeline including HTTP security headers (6 headers, 10 CSP directives), debug route lockdown (`DISABLE_DEBUG_ROUTES`), and rate limiting (4 tiers). |

## Technology Stack

| Layer | Technology | Notes |
| --- | --- | --- |
| **Framework** | Nuxt 4 (^4.4.8) | Full-stack Vue framework with SSR and file-based routing. |
| **UI** | `@nuxt/ui` ^4.9.0 | Tailwind CSS v4 based component library. |
| **Language** | TypeScript (^5.9.3) | Strict typing throughout. |
| **Runtime** | Node.js >= v24 or Bun | Dual-runtime support; Bun is preferred. |
| **Package Manager** | Bun (preferred) | npm also works. |
| **Database** | SQLite via Drizzle ORM | `bun:sqlite` under Bun, `better-sqlite3` under Node.js. |
| **Auth** | `nuxt-auth-utils` 0.5.25 | Session-based authentication. |
| **JWT** | `jose` ^6.2.3 | JWT signing and verification for OAuth2 access tokens. |
| **AI** | `openai` ^6.45.0 | OpenAI SDK used for DeepSeek API integration. |
| **Validation** | Zod 4.x (^4.4.3) | Schema validation for all API inputs. |
| **Fonts** | `@nuxt/fonts` ^0.14.0 | Local font provider. |
| **Icons** | `@iconify-json/lucide`, `@iconify-json/material-symbols`, `@iconify-json/simple-icons` | Icon sets. |
| **Linting** | `@nuxt/eslint` 1.10.0 + Prettier ^3.9.4 | Semicolons enabled, double quotes. |
| **Deployment** | Node.js server (VPS) | Bun also supported; Nitro `node-server` preset. |

### Live Dependency Versions

The following tables are generated automatically from the root `package.json` during each VitePress build or dev server start. They reflect the exact dependency versions currently declared in the repository.

<PackageVersions />

## Authentication

Two authentication methods are supported:

### 1. Microsoft OAuth2

Authentication is delegated to Microsoft Entra ID (tenant configured via the `MICROSOFT_TENANT_ID` environment variable). Users click the Microsoft login button and are redirected to the Microsoft consent screen. On success, they are redirected back with an authorization code that is exchanged for a basishacks session. This is the only login method for the hackathon registry.

### 2. basishacks connect

A custom OAuth2 integration with **PKCE (Proof Key for Code Exchange)** support. External applications redirect users to `/api/oauth2/authorize` with standard OAuth2 parameters (`client_id`, `scope`, `redirect_uri`, `state`, `code_challenge`, `code_challenge_method`). After the user authenticates and consents, the application receives an authorization code that can be exchanged for a JWT access token at `/api/oauth2/token`.

The OAuth2 flow supports:

- Authorization Code Grant with PKCE (protocol 2.1).
- Legacy Authorization Code Grant without PKCE (protocol 2.0).
- JWT access tokens (HS256, 1-hour expiry) signed with `NUXT_OAUTH2_JWT_SECRET`.
- Eight defined scopes with admin-only and sensitive classifications.
- Microsoft proxy mode: applications can skip the basishacks login and redirect directly to Microsoft.

## Roles & Permissions

### Core Roles

Users are assigned one of three core roles in the database:

| Role          | Description                                                                      |
| ------------- | -------------------------------------------------------------------------------- |
| `participant` | Default role. Can join teams, submit projects, and vote.                         |
| `judge`       | Can score projects using the rubric system. Has access to the judging interface. |
| `admin`       | Full access to all features, including the developer portal.                     |

### Fine-Grained Developer Permissions

Beyond the three core roles, the platform supports fine-grained permissions stored as space-separated strings in the `role` column. These are managed through the `DevPermissions` constants in `shared/permissions.ts`:

| Permission | Description |
| --- | --- |
| `dev_users` | Access to user management utilities. |
| `dev_teams` | Access to team management utilities. |
| `dev_debug` | Access to debug endpoints. |
| `dev_deepseek` | Access to DeepSeek AI features. |
| `portal.users.view` | View users in the developer portal. |
| `portal.debug.view` | View debug tools in the developer portal. |
| `portal.teams.view` | View teams in the developer portal. |
| `portal.deepseek.view` | View DeepSeek tools in the developer portal. |
| `portal.applications.view` | View OAuth2 applications. |
| `portal.applications.create` | Create OAuth2 applications. |
| `portal.applications.create.firstparty` | Create first-party OAuth2 applications. |
| `portal.applications.delete` | Delete OAuth2 applications. |
| `portal.applications.view.all` | View all OAuth2 applications, including those owned by other users. |
| `portal.seasons.view` | View season management. |
| `portal.seasons.edit` | Edit seasons. |

The `hasPermission()` helper checks both the specific permission and the `admin` permission (admins implicitly have all permissions).

## Seasons System

The platform supports multiple hackathon seasons. Each season has:

- **Theme name**: the creative theme for the hackathon (for example, "Signal" or "Beneath the Surface").
- **Theme description**: a brief description of the theme.
- **Date**: when the season takes place.
- **Documentation link**: optional link to season documentation.
- **Active status**: only one season can be active at a time.

Teams are associated with a specific season via the `season_id` foreign key. The active season determines which teams and projects are displayed.

Season metadata is defined in `shared/seasons.ts` and managed through the `/api/seasons/` endpoints.

## Directory Structure

```
basishacks-r2/
├── app/                        # Nuxt app (Vue frontend)
│   ├── assets/css/             # Global styles (Tailwind + custom utilities)
│   ├── components/             # Vue components
│   │   ├── SafeLink.vue        # URL-aware link renderer with open redirect protection
│   │   ├── SafeComark.vue      # Safe markdown renderer using SafeLink for links
│   ├── composables/            # Vue composables (useApiUser, etc.)
│   ├── layouts/                # Nuxt layouts (default, dashboard, fullwidth, etc.)
│   ├── middleware/             # Route middleware (auth.ts)
│   ├── pages/                  # File-based routing
│   │   ├── dashboard/          # Dashboard pages (teams, general, results)
│   │   ├── developers/         # Admin/developer portal
│   │   │   ├── applications/   # OAuth2 app management (create, list, detail)
│   │   │   ├── debug.vue       # Debug tools
│   │   │   ├── deepseek.vue    # DeepSeek AI chat interface
│   │   │   ├── seasons.vue     # Season management
│   │   │   ├── teams.vue       # Team management
│   │   │   └── users.vue       # User management
│   │   ├── user/               # User profile pages
│   │   ├── api/oauth2/         # OAuth2 authorize page
│   │   ├── judging/            # Judge scoring interface
│   │   ├── voting.vue          # Peer voting interface
│   │   └── showcase.vue        # Project showcase
│   ├── utils/                  # Frontend utilities (consts, errors, loading)
│   ├── app.config.ts           # App-level configuration
│   ├── app.vue                 # Root Vue component
│   └── error.vue               # Error page
│
├── server/                     # Nitro backend
│   ├── api/                    # API route handlers (file-based)
│   │   ├── admin/              # Admin endpoints (scores, teams)
│   │   ├── applications/       # OAuth2 application CRUD, secrets, scopes, redirect URIs
│   │   ├── auth/               # Authentication endpoints (impersonate; /api/auth alias for Microsoft OAuth2 callback)
│   │   ├── ballot/             # Ballot and peer voting endpoints
│   │   ├── chatbot/            # AI chatbot endpoints (Microsoft Teams integration)
│   │   ├── debug/              # Debug endpoints (DeepSeek sessions, file upload)
│   │   ├── oauth2/             # OAuth2 protocol endpoints (authorize, token, userinfo, callbacks)
│   │   ├── seasons/            # Season management endpoints
│   │   ├── teams/              # Team CRUD, member management, scoring, submission
│   │   ├── users/              # User CRUD and profile pictures
│   │   └── _webhooks/          # Lifecycle and update webhooks
│   ├── middleware/             # Server middleware
│   │   ├── security-headers.ts # HTTP security headers (6 headers, CSP, HSTS, etc.)
│   │   ├── debug-lockdown.ts   # Disables debug routes in production via DISABLE_DEBUG_ROUTES
│   │   └── oauth2-authorize.ts # OAuth2 authorize session validation
│   ├── database/               # Drizzle ORM schema, migration runner, and DB wrapper
│   │   ├── schema.ts           # Drizzle table definitions
│   │   ├── migrate.ts          # Custom migration runner, legacy schema repair, seeding
│   │   └── index.ts            # Runtime-agnostic SQLite driver selection
│   ├── plugins/                # Nitro plugins
│   │   ├── init-database.ts    # Database initialization and attach Drizzle to event context
│   │   ├── microsoft.ts        # MS Graph API token initialization and centralized API calls
│   │   ├── validate-environment.ts     # Startup guard for NUXT_SESSION_PASSWORD and NUXT_OAUTH2_JWT_SECRET
│   │   └── validate-oauth2-jwt-secret.ts # Startup guard for NUXT_OAUTH2_JWT_SECRET (also exposed as testable utility)
│   ├── types/                  # Type augmentations (H3EventContext, OAuth2 JWT)
│   └── utils/                  # Server utilities
│       ├── database/           # Per-table DB helpers
│       │   ├── awards.ts
│       │   ├── ballots.ts
│       │   ├── hackathon.ts
│       │   ├── members.ts
│       │   ├── oauth2_applications.ts
│       │   ├── peer-voting.ts
│       │   ├── scores.ts
│       │   ├── seasons.ts
│       │   ├── teams.ts
│       │   └── users.ts
│       ├── auth.ts             # requireUser, requireJudge, requireAdmin, requirePermission
│       ├── convert.ts          # DB row to public API object transformers
│       ├── rateLimit.ts        # In-memory rate limiter (4 tiers: general/auth/vote/upload)
│       ├── oauth2.ts           # Microsoft OAuth2 configuration and link generation
│       ├── oauth2-jwt.ts       # JWT verification and withOAuth2JWT() wrapper for API routes
│       ├── oauth2-validate.ts  # OAuth2 authorization request validation and consent flow
│       ├── profile.ts          # Profile picture helpers
│       ├── assets.ts           # Asset helpers
│       ├── url-validation.ts   # SSRF protection — validates external URLs, blocks private IPs
│       ├── validate-oauth2-jwt-secret.ts # Dev-only fallback for NUXT_OAUTH2_JWT_SECRET
│       └── deepseek-store.ts   # DeepSeek AI chat session store (in-memory)
│
├── shared/                     # Code shared between client and server
│   ├── schemas.ts              # Zod schemas for API input validation
│   ├── database.d.ts           # TypeScript types matching DB schema exactly
│   ├── responses.d.ts          # API response interface definitions
│   ├── auth.d.ts               # nuxt-auth-utils session type augmentation
│   ├── oauth2-scopes.ts        # OAuth2 scope definitions, descriptions, and helpers
│   ├── permissions.ts          # Permission constants (DevPermissions) and helpers
│   ├── rubric.ts               # Judging rubric definitions (junior/senior criteria and weights)
│   └── seasons.ts              # Season metadata (theme, date, docs links)
│
├── sql/archive/                # Archived legacy SQL schema and migrations
│   ├── init.sql                # Historical base schema
│   ├── migration-*.sql         # Historical dated migrations
│   └── patch-*.sql             # Historical feature patches
│
├── drizzle/                    # Drizzle Kit generated migration files
│   ├── *.sql                   # Migration SQL
│   └── meta/                   # Drizzle Kit metadata snapshots
│
├── tests/                      # Vitest test suite
│   ├── setup.ts                # Global test setup, in-memory DB, mocks
│   ├── **/*.test.ts            # API, server utility, shared, component, page, etc.
│   ├── index.js                # Legacy test runner (kept for reference)
│   ├── test.deepseek.ts        # Legacy DeepSeek API tests (reference)
│   └── test.microsoft.ts       # Legacy MS Graph API tests (reference)
│
├── bun-shim/                   # Compatibility shim for `bun test`
│   └── shim.test.ts            # Prints guidance to use `bun run test`
│
├── database/                   # SQLite database file (basishacks.sqlite, WAL mode)
├── documentation/              # VitePress documentation site
├── public/                     # Static assets (fonts, images, uploads)
└── scripts/                    # Build scripts
```

## Key Concepts

### Single-Row Hackathon State

The `hackathon` table contains a single row (`id = 1`) that controls the global event state. The status field determines what actions are available:

| Status        | Description                                           |
| ------------- | ----------------------------------------------------- |
| `not_started` | Before the event: teams can form and submit projects. |
| `in_progress` | During the event: project submissions are accepted.   |
| `voting`      | After the event: peer voting is open.                 |
| `finished`    | Event completed: results are published.               |
| `paused`      | Event paused for maintenance.                         |

### Pathways

Teams are categorized into two pathways with different judging rubrics:

- **Junior**: weighted toward Innovation & Originality (30%).
- **Senior**: weighted toward Impact & Usefulness (30%).

### Rubric System

Each pathway has five criteria scored 0–5 by judges:

| Criterion                | Junior Weight | Senior Weight |
| ------------------------ | :-----------: | :-----------: |
| Innovation & Originality |      30%      |      10%      |
| Presentation & Design    |      25%      |      25%      |
| Technical Complexity     |      20%      |      20%      |
| Theme Alignment          |      15%      |      15%      |
| Impact & Usefulness      |      10%      |      30%      |

### Peer Voting

During the voting phase, participants distribute 10 stars across eligible projects in the same pathway. The total stars assigned must sum to exactly 10, enforced by the `SubmitVoteRequest` Zod schema.

## Build & Development Commands

```bash
# Install dependencies
bun i

# Dev server (HTTPS, port 24598)
bun dev --https

# Production build
bun run build

# Preview built app
bun run preview

# Run tests
bun run test

# Format code
bun run format
```

## Code Style

The project follows these conventions:

- **Prettier**: semicolons enabled, double quotes, `tabWidth: 4`, `trailingComma: all`, `printWidth: 100`.
- **ESLint**: configured via `@nuxt/eslint`.
- **Imports**: use `~~/` for project root imports in server code, `~/` for app imports.
- **Components**: prefer `const` and arrow functions.
- **Vue**: Composition API with `<script setup lang="ts">`.

## Next Steps

- [Environment Setup](/guide/environment-setup): configure your development environment.
- [Architecture Overview](/architecture/overview): understand how the app works internally.
- [Authentication & Authorization](/architecture/auth): deep dive into the auth system.
- [OAuth2 System](/architecture/oauth2): learn about the OAuth2 authorization server.

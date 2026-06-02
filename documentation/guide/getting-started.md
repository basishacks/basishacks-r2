# Getting Started

Welcome to the **basishacks** documentation. This site provides comprehensive technical documentation for the BIBS-C Network Hackathon (Season 2, 2025–26) platform.

## What is basishacks?

basishacks is the official website and platform for the BIBS-C Network Hackathon. It is a full-stack Nuxt 3 application that manages:

- **Hackathon registration and scheduling** — event lifecycle from `not_started` through `in_progress`, `voting`, and `finished`
- **Team creation and management** — users form teams, add members by email
- **Project submission** — teams submit project name, description, demo URL, and repo URL
- **Peer voting** — participants distribute 12 stars across 4 assigned projects
- **Judge scoring** — judges evaluate projects using weighted rubric criteria (0–5 per criterion)
- **OAuth2 application integrations** — developers can register applications, manage secrets, redirect URIs, and scopes
- **Microsoft Teams integration** — meeting creation, chat messaging, and webhook notifications via Microsoft Graph API

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Nuxt 3 (latest) |
| UI | `@nuxt/ui` ^4.7.1 (Tailwind CSS v4 based) |
| Language | TypeScript 5.6+ |
| Runtime | Node.js >= v24 |
| Package Manager | Bun (preferred); npm works |
| Database (local) | `better-sqlite3` with WAL mode |
| Database (prod) | Cloudflare D1 (binding name `DB`) |
| Auth | `nuxt-auth-utils` (session-based) |
| Validation | Zod 4.x |
| Fonts | `@nuxt/fonts` (local provider) |
| Icons | `@iconify-json/lucide`, `@iconify-json/material-symbols` |
| Linting | `@nuxt/eslint` + Prettier |
| Deployment | Cloudflare Pages via GitHub Actions |

## Quick Start

```bash
# Clone the repository
git clone <repo-url>
cd basishacks-r2

# Install dependencies
bun i

# Initialize local database
bunx wrangler d1 execute DB --file sql/init.sql
bunx wrangler d1 execute DB --command 'INSERT INTO hackathon VALUES(1, "not_started", 0, 0, 0, 0, 0, NULL, NULL) ON CONFLICT DO NOTHING'

# Copy environment variables
cp .env.example .env
# Fill in the required values in .env

# Start development server (HTTPS, port 24598)
bun dev --https
```

## Documentation Structure

This documentation is organized into the following sections:

- **Guide** — Getting started, project overview, and environment setup
- **Architecture** — Runtime architecture, database design, authentication, and OAuth2 system
- **Frontend** — Vue components, pages, layouts, and composables
- **Backend** — API reference, server utilities, plugins, and middleware
- **Shared Code** — Zod schemas, TypeScript types, rubric definitions, permissions, and OAuth2 scopes
- **Deployment & Operations** — Cloudflare deployment, security considerations, and rate limiting

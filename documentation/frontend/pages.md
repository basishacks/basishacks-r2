---
title: Pages
description: File-based routes in the basishacks frontend — home, dashboard, voting, judging, developer portal, and OAuth2 flows.
---

# Pages

The basishacks frontend contains **26 page files** in `app/pages/`, mapped to routes via Nuxt's file-based routing. All pages use `<script setup lang="ts">`.

## Public Pages

### `/` (index)

**File:** `app/pages/index.vue`

The home page. Fetches the active hackathon season from `/api/seasons/active` and renders:

- **Welcome message** with the `WEBSITE_NAME` constant
- **Status alert** — links to `/dashboard` when the hackathon has started or finished
- **Schedule section** — conditionally renders `LargeCountdown` components based on hackathon status:

| Status        | Countdowns shown                 |
| ------------- | -------------------------------- |
| `not_started` | Hackathon starts, Hackathon ends |
| `in_progress` | Hackathon ends, Voting starts    |
| `voting`      | Voting ends, Results released    |
| `paused`      | Maintenance message              |
| `finished`    | No countdowns                    |

- **Detailed schedule** — collapsible section with `DateTime` components for all timestamps
- **Theme section** — reveals theme name and description once set, otherwise shows a countdown to the start date
- **Resources section** — links to last year's showcase and the rules page

**Layout:** `default`

```vue
// No auth required
```

### `/profile`

**File:** `app/pages/profile.vue`

User profile editing page. Protected by `auth` middleware.

**Features:**

- Displays greeting with user name or email
- **Name editing** — text input validated by `UpdateUserRequest`
- **Avatar upload** — `UFileUpload` with live preview via `UserAvatar`. Supports removing the current avatar. Converts uploaded files to base64 before sending.
- **Profile theme image** — `UFileUpload` for background image. Displays the current theme as a CSS background. Affects the user's profile page (`/user/{id}`) and `UserPopover` card.
- **Logout button** — clears the session and navigates to `/`

**API:** `PATCH /api/users/{id}` with body containing `name`, `avatar` (base64 or null), `profile_theme_image` (base64 or null).

**Layout:** `default`

### `/rules`

**File:** `app/pages/rules.vue`

Static rules page listing hackathon requirements:

- Open-source repository (GitHub or Gitee)
- README file
- Public demo URL (with specific rules for websites, desktop apps, games, and mobile apps)
- Demo video (1–3 minutes)
- Theme adherence

**Layout:** `default`

### `/showcase`

**File:** `app/pages/showcase.vue`

Animated showcase page for the top projects from the current season. A highly visual, scroll-driven experience.

**Layout:** `fullwidth-nostick`

**Sections:**

| Section | Description |
| --- | --- |
| Title | Full-screen landscape background with "When there is Signal" title, neon flicker animation |
| Team #1 | Scroll-driven video playback, cursor-following gold aura effect, slide-right description transition |
| Team #2 | Word-by-word shake animation for project name, metallic silver styling, dual image layout |
| Team #3 | Slide-left transition, metallic bronze styling, window mockup with screenshot |
| All Projects | Dual `UMarquee` carousels of `ShowcaseMarqueeCard` components, clickable to open a project modal |

**Scroll-driven animations:**

- Team #1 video: `currentTime` is set proportional to scroll position within the section
- Team #2 and #3: visibility triggers when elements enter the viewport
- "Scroll for more" indicator fades out after scrolling past 25% viewport height

**Preloading:** Images and videos are preloaded via `<link rel="preload">` in `useHead`.

**Components used:** `GoBackUp`, `LoaderAnimation`, `ResultsProjectLinks`, `ShowcaseMarqueeCard`, `ProjectCard`

::: tip This page uses custom CSS animations including `metallic-gold`, `metallic-silver`, `metallic-bronze`, `neon` flicker, and `appearAndShake` word animations. :::

### `/beneath-the-surface`

**File:** `app/pages/beneath-the-surface.vue`

Season 1's data-driven winners showcase for **Beneath the Surface**. Its `ShowcaseBeneathTheSurface` component fetches `/api/teams?season_id=1` and merges the public records with a frozen historical winner configuration.

**Layout:** `fullwidth-nostick`

| Pathway | Rank | Project                    |
| ------- | ---- | -------------------------- |
| Junior  | 1    | Where the Rainbow Ends     |
| Junior  | 2    | Beneath the Land           |
| Junior  | 3    | Horror Forest              |
| Senior  | 1    | metadata manipulation tool |
| Senior  | 2    | Unseen Layers              |
| Senior  | 3    | TraceShadow                |

Each winner receives a full-viewport, project-specific visual chapter. Project names, team names, and external links come from the Season 1 API; the frozen title and summary remain visible if a record cannot be loaded.

**Motion:** GSAP and ScrollTrigger create the hero entrance, depth progress, desktop pinned sections, scroll-linked reveals, ambient layers, and pointer parallax. Mobile layouts use natural scrolling. `prefers-reduced-motion` disables pinning, scrubbing, parallax, and ambient movement while keeping all content visible.

**Components used:** `ShowcaseBeneathTheSurface`, `GoBackUp`

### `/voting`

**File:** `app/pages/voting.vue`

Peer voting page. Protected by `auth` middleware. Only accessible during the `voting` hackathon status.

**Flow:**

1. Fetches ballot data from `/api/ballot`
2. Displays eligible `VotingProjectCard` components in a grid
3. User distributes **10 stars** among eligible projects (0–5 per project)
4. Increment/decrement buttons with validation (total must equal 10)
5. Reasoning textarea
6. Submit with browser `confirm()` dialog

**Validation:** Uses `SubmitVoteRequest` schema. Posts to `/api/ballot`.

**Layout:** `default`

### `/contributing`

**File:** `app/pages/contributing.vue`

Contributing guidelines and security disclosure policy. Contains commit guidelines, instructions for privately reporting security issues (with guidance on self-fixing via obfuscated pull requests), a responsible disclosure policy, and a code of conduct. Written in professional academic American English. Linked from the site footer.

**Layout:** `default`

## Judging Pages

### `/judging`

**File:** `app/pages/judging/index.vue`

Judge landing page. Protected by `auth` middleware. Accessible only by judges or admins during the `voting` status.

**Guards:**

- Redirects to `/` if hackathon status is not `voting`
- Redirects to `/` if user lacks judge or admin permissions

**Content:**

- Static summary of participation statistics
- **Current Evaluations** section — shows `JudgeProgressCard` for the active season
- **Past Evaluations** section — shows `JudgeProgressCard` entries for past seasons with at least one scored team
- **Continue** button — navigates to `/judging/continue`

**Layout:** `default`

### `/judging/continue`

**File:** `app/pages/judging/continue.vue`

Active judging interface. Protected by `auth` middleware. Accessible only by judges or admins during the `voting` status.

**Flow:**

1. Fetches teams for judging from `/api/teams?judging=1`
2. Renders a `JudgingCard` for each team (project descriptions rendered via `SafeComark`)
3. After scoring, refreshes the list

**Layout:** `default`

## Dashboard Pages

### `/dashboard`

**File:** `app/pages/dashboard/index.vue`

Main dashboard overview. Protected by `auth` middleware. Uses `dashboard` layout.

**Features:**

- Welcome message with status-dependent text (not started, in progress, voting, finished, paused)
- If no team: prompt to create or join a team
- If has team: `ProjectCard` showing the current project
- Action cards linking to General, Teams, and Results pages
- **Confetti animation** — helper functions exist for ranks 1–10 but are not automatically triggered on mount

**Unsaved changes protection:** Listens for `onBeforeRouteLeave` and `beforeunload` events.

**Layout:** `dashboard`

### `/dashboard/general`

**File:** `app/pages/dashboard/general.vue`

Project editing page. Protected by `auth` middleware.

**States:**

- No team and hackathon not started → "Hackathon not started yet!" CTA
- No team and hackathon started → "You don't have a team yet!" CTA
- Has team → `ProjectForm` (disabled when submission is closed or already submitted)
- Project already submitted → congratulations message with disabled form

**XSS-safe content:** All user-provided project content (descriptions, sourcing notes) is rendered using `SafeComark` throughout the page, which sanitizes inline Markdown and replaces `<a>` tags with `SafeLink` to prevent unsafe URLs.

**Unsaved changes protection:** Same pattern as dashboard index — `onBeforeRouteLeave` + `beforeunload`.

**Layout:** `dashboard`

### `/dashboard/teams`

**File:** `app/pages/dashboard/teams/index.vue`

Team creation and management. Protected by `auth` middleware.

**States:**

- No team → `CreateTeamRequest` form (team name only)
- Has team → `TeamForm` component

**Layout:** `dashboard`

### `/dashboard/results`

**File:** `app/pages/dashboard/results.vue`

Season results page. Protected by `auth` middleware.

**Content:**

- Current season results via `ScoreCard`
- Past season results via `ScoreCard` for each `past_teams` entry

**Layout:** `dashboard`

### `/dashboard/presentation`

**File:** `app/pages/dashboard/presentation.vue`

Placeholder page for the presentation event. States that top 10 teams will be invited to present.

**Layout:** `dashboard`

## Developer Portal

**Access:** The entire developer portal is admin-only. The `developers-dashboard` layout enforces this with a hard 403 at the layout level. There is no non-admin developer role.

### `/developers`

**File:** `app/pages/developers/index.vue`

Developer portal landing page. Shows a welcome message. Wrapped in `UDashboardPanel` with `UDashboardNavbar` and `UDashboardSidebarCollapse` so mobile users can open the sidebar navigation.

**Layout:** `developers-dashboard`

### `/developers/users`

**File:** `app/pages/developers/users.vue`

User management page.

**Layout:** `developers-dashboard`

### `/developers/teams`

**File:** `app/pages/developers/teams.vue`

Team management page.

The table includes a **Members** column that renders a `UserAvatarGroup` (with `developer-mode` enabled, so hovering shows each member's id beside their name) fed by the `members` array returned from `GET /api/admin/teams`.

**Layout:** `developers-dashboard`

### `/developers/applications`

**File:** `app/pages/developers/applications/index.vue`

OAuth2 application listing page.

**Layout:** `developers-dashboard`

### `/developers/applications/create`

**File:** `app/pages/developers/applications/create.vue`

OAuth2 application creation form.

**Layout:** `developers-dashboard`

### `/developers/admin`

**File:** `app/pages/developers/admin.vue`

Hackathon Administration panel. Only accessible to admin users; non-admins receive a hard 403 even if they know the URL.

**Season Picker** — Dropdown to select the active season, with "Set Active" and "+ New Season" buttons. Defaults to the last (newest) season on open.

**Season Name** — Editable text input to rename the selected season, with a "Rename Season" button.

**Hackathon Configuration** — All 14 fields are per-season. Changes auto-save via `@change` / `@update:model-value` handlers that fire a serialized PATCH chain carrying ALL form fields. Each PATCH writes to the selected season (with `season_id`); when editing the active season, values are also synced to the global hackathon row. No "Save" button — every field change is instantly persisted via a single in-flight PATCH with no race conditions.

**Save mechanism details:**

- All fields (`status`, `voting_enabled`, `judging_open`, `results_published`, `max_votes_per_user`, `theme_name`, `theme_description`, `schedule_start`, `schedule_end`, `start_timestamp`, `end_timestamp`, `voting_start_timestamp`, `voting_end_timestamp`, `results_open_timestamp`) are sent in every PATCH body
- Saves are serialized via a Promise chain (`patchChain`) — only one PATCH in-flight at a time
- `refreshAdmin()` runs after each PATCH in strict order
- The form snapshot is captured synchronously in the event handler (no debounce)
- Timestamps use `datetimeToTs()` ↔ `tsToDatetime()` for epoch ↔ datetime-local conversion
- Booleans are stored as `0`/`1` via `:true-value="1" :false-value="0"` on UCheckbox

**Database Export** — Download the full database as SQLite or CSV (admin-only).

**Layout:** `developers-dashboard`

### `/developers/applications/[id]`

**File:** `app/pages/developers/applications/[id].vue`

OAuth2 application editor with two tabs: **General details** and **Authorization (DevConnect)**.

**General tab:**

- Application name, client ID, description
- Type badge (first-party / third-party)
- Proxy Microsoft badge
- Redirect URIs list

**Authorization tab:**

| Section | Description |
| --- | --- |
| Client Secrets | Create/delete secrets. New secrets shown once in a modal with copy button. Abbreviated versions stored. |
| Redirect URIs | Add/remove URIs with `ManageRedirectUriRequest` validation. Must start with `http://localhost` or `https://`. |
| Scope Permissions | Add scopes from `OAuth2Scopes` registry. Admin-only scopes require elevated permissions. Sensitive scopes show "User Consent" badge. |
| OAuth2 URL Generator | Select scopes and redirect URI to generate an authorization URL. Includes PKCE requirement notice. |

**Layout:** `developers-dashboard`

### `/developers/deepseek`

**File:** `app/pages/developers/deepseek.vue`

DeepSeek AI chat interface.

**Layout:** `developers-dashboard`

### `/developers/debug`

**File:** `app/pages/developers/debug.vue`

File upload and debug utilities. Permission-gated.

**Layout:** `developers-dashboard`

### `/developers/seasons`

**File:** `app/pages/developers/seasons.vue`

Season management page. Permission-gated (`portal.seasons.view`; editing requires `portal.seasons.edit` or admin).

Contains two sections:

- **Active Season** — select the current season (`PATCH /api/seasons/active`); activating a season copies its tweaks into the live `hackathon` row.
- **Hackathon Configuration** — edit all settings, including per-season score and rank visibility, through `/api/admin/hackathon`.

**Layout:** `developers-dashboard`

## OAuth2 Flow

### `/api/oauth2/authorize`

**File:** `app/pages/api/oauth2/authorize.vue`

Full OAuth2 authorization page with login + consent flow. Uses **no layout** (`layout: false`).

**Background:** Canvas-based matrix rain animation (green characters on black background).

**Flow states:**

| State | Description |
| --- | --- |
| `load` | Initial loading state |
| `login` | Microsoft OAuth2 sign-in button |
| `sensitive_consent` | Consent screen showing scope descriptions, user avatar, and app avatar with preloaded images |
| `error` | Error display with optional "Try Again" button |

**Login methods:**

1. **Microsoft OAuth2** — Redirects to Microsoft login via `/api/oauth2/to_microsoft`

**Consent screen:**

- Shows user avatar and app avatar connection
- Lists scope descriptions with sensitive/non-sensitive indicators
- "Consent" or "Deny" buttons
- Displays logged-in user name with `UserPopover`

**Session management:** Uses `/api/oauth2/session` (GET/POST/DELETE) to manage the OAuth2 authorization session state.

::: warning This page handles the complete OAuth2 authorization code flow. The `bridge_error` cookie is used to pass error states from server middleware to the client page. :::

## User Profile

### `/user/[id]`

**File:** `app/pages/user/[id].vue`

Public user profile page.

**Features:**

- Fetches user data from `/api/users/{id}`
- If the user has a `profile_theme` with mode `url`, sets the background image from `/userast/{value}`
- Full-height container with default background overlay

**Layout:** `fullwidth` (set programmatically via `setPageLayout`)

### `/user`

**File:** `app/pages/user/index.vue`

Redirects an authenticated user to their own profile page (`/user/{id}`). If the user is not logged in, redirects to `/login`.

## Debug

### `/debug`

**File:** `app/pages/debug.vue`

Admin-only debug page with two tabs:

- **File Upload** — upload files to `/assets` or `/userast`, list uploaded files, and copy permalinks
- **DeepSeek Chat** — create chat sessions, send messages, and delete sessions via `/api/debug/deepseek/sessions`

Protected by `auth` middleware and an admin permission check.

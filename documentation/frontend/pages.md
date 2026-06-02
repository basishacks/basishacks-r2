# Pages

The application uses Nuxt's file-based routing with 23 pages across several sections.

## Public Pages

### Home — `/`

**File**: `app/pages/index.vue`

The landing page of the hackathon website.

- Fetches hackathon status and displays a welcome message
- Dynamic schedule section with `LargeCountdown` components for key milestones
- Collapsible detailed schedule with `DateTime` values
- Theme section that reveals the theme or shows a countdown
- Resources section with links to last year's showcase and rules

### Rules — `/rules`

**File**: `app/pages/rules.vue`

Static informational page listing hackathon rules and project requirements.

- Required items: open-source repo, README, public demo URL, 1–3 minute demo video, theme alignment
- Sub-rules for different project types (websites, desktop apps, games, mobile apps)

### Results — `/results`

**File**: `app/pages/results.vue` · **Layout**: `fullwidth-nostick`

Visually rich, scroll-driven results showcase for the top 3 teams.

- Full-screen hero with background image and neon-flickering text
- Team 1 (#1 Gold): scroll-driven video playback, cursor-following golden aura
- Team 2 (#2 Silver): staggered word-by-word animation, metallic silver styling
- Team 3 (#3 Bronze): slide-left animation, dark red section
- Extensive CSS: metallic gradient text effects, neon flicker, word shake animations
- Preloads all images and videos

### Debug — `/debug`

**File**: `app/pages/debug.vue`

Development/debugging page with two tabs:

- **File Upload**: Upload files with mode selector (static/user), keep original name option, permalink display, file listing
- **DeepSeek Chat**: Create/delete chat sessions, send messages, view history

## Authenticated Pages

### Profile — `/profile`

**File**: `app/pages/profile.vue` · **Middleware**: `auth`

User profile editing page.

- Edit display name
- Upload/remove avatar image (with live preview)
- Upload/remove profile theme image (background for public profile)
- Link to public profile page
- Log out button

### Judging — `/judging`

**File**: `app/pages/judging.vue` · **Middleware**: `auth`

Judge scoring interface.

- Requires judge or admin role
- Only accessible during `voting` status
- Renders `JudgingCard` for each eligible team
- Refreshes data after each score submission

### Voting — `/voting`

**File**: `app/pages/voting.vue` · **Middleware**: `auth`

Peer voting page.

- Fetches user's ballot with 4 assigned projects
- Star distribution: exactly 12 stars across 4 projects (1–5 each)
- Required reasoning textarea (30–2000 chars)
- Confirmation dialog before submission
- Read-only after voting

## Dashboard Pages

All dashboard pages use the `dashboard` layout and `auth` middleware.

### Dashboard Overview — `/dashboard`

**File**: `app/pages/dashboard/index.vue`

Main dashboard landing page.

- Shows team status and welcome message
- After hackathon ends: displays score card with rank and metallic gradient effects for top 3
- Confetti animation for top 10 teams (different effects for 1st, 2nd, 3rd)
- Uses `sessionStorage` to prevent repeated confetti triggers

### General — `/dashboard/general`

**File**: `app/pages/dashboard/general.vue`

Project submission/editing page.

- Shows CTA to create team if user has none
- Renders `ProjectForm` for editing project details
- Form disabled if project already submitted or hackathon not in progress
- Warns on navigation with unsaved changes

### Teams — `/dashboard/teams`

**File**: `app/pages/dashboard/teams/index.vue`

Team creation and management page.

- Create new team form (validated against `CreateTeamRequest`)
- Manage existing team via `TeamForm` component
- Form disabled if hackathon not active or project submitted

### Presentation — `/dashboard/presentation`

**File**: `app/pages/dashboard/presentation.vue`

Placeholder page for future presentation feature.

## Developer Portal Pages

All developer portal pages use the `developers-dashboard` layout.

### Developer Home — `/developers`

**File**: `app/pages/developers/index.vue`

Simple welcome page for the developer portal.

### Users — `/developers/users`

**File**: `app/pages/developers/users.vue` · **Permission**: `portal.users.view`

User management table with filtering, sorting, column visibility, bulk delete, and pagination.

### Teams — `/developers/teams`

**File**: `app/pages/developers/teams.vue` · **Permission**: `portal.teams.view`

Team management table with filtering, sorting, column visibility, bulk delete, and pagination.

### Applications — `/developers/applications`

**File**: `app/pages/developers/applications/index.vue` · **Permission**: `portal.applications.view`

OAuth2 application management list with create, filter, sort, bulk delete.

### Create Application — `/developers/applications/create`

**File**: `app/pages/developers/applications/create.vue` · **Permission**: `portal.applications.create`

Form to create a new OAuth2 application with name, description, type, and proxy settings.

### Application Detail — `/developers/applications/:id`

**File**: `app/pages/developers/applications/[id].vue`

Detailed view and management for a single OAuth2 application.

- **General details tab**: name, client ID, description, type, proxy, redirect URIs
- **Authorization tab**: client secrets (create/delete), redirect URIs (add/remove), scope permissions (add/remove), OAuth2 URL generator

### Debug — `/developers/debug`

**File**: `app/pages/developers/debug.vue` · **Permission**: `portal.debug.view`

File upload debug tool (same functionality as `/debug` file upload tab).

### DeepSeek — `/developers/deepseek`

**File**: `app/pages/developers/deepseek.vue` · **Permission**: `portal.deepseek.view`

DeepSeek chat session management (same functionality as `/debug` DeepSeek tab).

## User Profile Pages

### User Redirect — `/user`

**File**: `app/pages/user/index.vue`

Redirects to the current user's public profile (`/user/{id}`).

### Public Profile — `/user/:id`

**File**: `app/pages/user/[id].vue` · **Layout**: `fullwidth`

Public profile page with customizable background theme image.

## OAuth2 Authorization Page

### Authorize — `/api/oauth2/authorize`

**File**: `app/pages/api/oauth2/authorize.vue` · **Layout**: none (custom)

OAuth2 authorization consent screen with Matrix rain background.

- Multi-step login flow: loading → login (magic code or Microsoft) → code entry → consent → redirect
- First-party apps skip consent
- Third-party apps show scope consent screen
- Animated transitions between states
- Error state with retry button

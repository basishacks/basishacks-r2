# Components

The application uses 18 Vue components located in `app/components/`. All components use `<script setup lang="ts">` and leverage `@nuxt/ui` components.

## Form Components

### ProjectForm

**File**: `app/components/ProjectForm.vue`

A comprehensive form for editing and submitting a team's project details.

**Props:**
- `team: APITeam` — the team object used to populate initial form values
- `disabled?: boolean` (default `false`) — disables the entire form

**Emits:**
- `dirty: [dirty: boolean]` — emitted when the form's dirty state changes
- `refresh: []` — emitted after a successful save or submit

**Features:**
- Watches the `team` prop to sync form state (name, pathway, project details)
- Two submit modes: **Save** (PATCH, validates against `UpdateTeamRequest`) and **Submit** (POST, validates against `SubmitTeamRequest`)
- Pathway selector (Junior/Senior) with help text
- Confirmation dialog before final submission

### TeamForm

**File**: `app/components/TeamForm.vue`

Form for managing an existing team — renaming, adding members, and removing members.

**Props:**
- `team: APITeam` — the full team object
- `disabled: boolean` — disables all interactive controls

**Emits:**
- `refresh` — signals the parent to refresh data

**Features:**
- Fetches team members on mount
- Rename team via modal with Zod validation
- Add member by email via modal
- Remove member with confirmation dialog

### JudgingCard

**File**: `app/components/JudgingCard.vue`

Card for judges to score a team's project using rubric criteria.

**Props:**
- `team: APITeam` — the team to judge

**Emits:**
- `scored: []` — emitted after successful score submission

**Features:**
- Dynamically builds scoring form from `shared/rubric.ts` based on team pathway
- Each criterion shows abbreviation, weight percentage, description tooltip, and 0–5 radio group
- Reasoning textarea (10–2000 chars)
- Validates against `CreateTeamScoresRequest` Zod schema
- Confirmation dialog before submission

## Display Components

### VotingProjectCard

**File**: `app/components/VotingProjectCard.vue`

Displays a project card for the peer voting phase.

**Props:**
- `project: APITeam['project']` — the project object

**Features:**
- Shows project name, description, and links to repo/demo
- Tooltips show full URLs

### ResultsCard

**File**: `app/components/ResultsCard.vue`

Displays a team's project on the results/leaderboard page.

**Props:**
- `team: APITeam` — the team object
- `rank: number | null` — the team's placement rank

**Features:**
- Shows rank prefix, project name, team name, description, and links

### ResultsProjectLinks

**File**: `app/components/ResultsProjectLinks.vue`

Renders icon buttons linking to a project's GitHub repo, demo, and video.

**Props:**
- `githubLink: string`
- `demoLink: string`
- `videoLink: string`

**Features:**
- Custom SVG icons with tooltips
- Video button opens inline player via `PopupMediaBrowser`

### UserPopover

**File**: `app/components/UserPopover.vue`

Hover-triggered popover that lazily fetches and displays user details.

**Props:**
- `user: Number` — the user ID to fetch data for

**Features:**
- Wraps slot in `UPopover` with `mode="hover"`
- Fetches `/api/users/{id}` on first hover

### RoleHeader

**File**: `app/components/RoleHeader.vue`

Main site header/navigation bar that adapts based on user role and hackathon status.

**Features:**
- Fetches current user and hackathon status
- Dynamic navigation items based on role and status
- Shows Judging link for judges during voting phase
- Shows Voting link for participants during voting phase
- Shows Results link when hackathon is finished
- Mobile menu toggle, color mode toggle, profile button

### Footer

**File**: `app/components/Footer.vue`

Global site footer with copyright, navigation links, and social buttons.

**Features:**
- Copyright notice (BISZ Developers' Club, BINJ Hack Club)
- Navigation links to biszweb.club and binj.dev
- Microsoft Teams and GitHub social buttons

## Utility Components

### LargeCountdown

**File**: `app/components/LargeCountdown.vue`

Prominent countdown timer displaying days, hours, minutes, and seconds.

**Props:**
- `date: Date` — target date
- `label: string` — descriptive label above countdown

**Features:**
- Updates every second via `setInterval`
- Displays `DD : HH : MM : SS` format
- Shows target date using `DateTime` component

### DateTime

**File**: `app/components/DateTime.vue`

Formats and displays a `Date` object as a localized string.

**Props:**
- `date: Date` — the date to display

**Features:**
- Uses `toLocaleString('en-CA', ...)` in `Asia/Shanghai` timezone
- Wrapped in `<ClientOnly>` to avoid hydration mismatches

### GoBackUp

**File**: `app/components/GoBackUp.vue`

Floating "scroll to top" button.

**Features:**
- Visible when scrolled past one viewport height
- Smooth scroll animation
- Fade transition for show/hide

### ModalConfirm

**File**: `app/components/ModalConfirm.vue`

Confirmation dialog for destructive actions.

**Props:**
- `color: String` (default `'primary'`) — confirm button color
- `click: Function` (default `() => {}`) — callback on confirm

### PopupMediaBrowser

**File**: `app/components/PopupMediaBrowser.vue`

Modal wrapper for displaying media content.

**Props:**
- `title: String` (default `'Media preview'`)
- `buttonLabel: String` (default `'Open media'`)
- `buttonIcon: String`
- `buttonVariant: String` (default `'ghost'`)
- `disabled: Boolean` (default `false`)

### FormRequiredNotification

**File**: `app/components/FormRequiredNotification.vue`

Helper text indicating required fields (red asterisk + "indicates a field is required").

### LoaderAnimation / LoaderAnimationInline

**Files**: `app/components/LoaderAnimation.vue`, `app/components/LoaderAnimationInline.vue`

Animated infinity symbol loading indicators.

**LoaderAnimation props:**
- `show: boolean` — controls visibility of full-screen overlay

**Features:**
- SVG infinity symbol with CSS animations (loop, raise, rotate)
- Full-screen variant (z-999 overlay) and inline variant
- "Just a moment" text below animation

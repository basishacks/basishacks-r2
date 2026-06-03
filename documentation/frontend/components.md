---
title: Components
description: Vue components used across the basishacks frontend — navigation, forms, scoring, avatars, and visual effects.
---

# Components

The basishacks frontend contains **22 Vue components** organized in `app/components/`. All components use `<script setup lang="ts">` and the `@nuxt/ui` component library.

## Navigation & Layout

### RoleHeader

**File:** `app/components/RoleHeader.vue`

The main navigation header rendered at the top of every page. Uses `UHeader` from `@nuxt/ui`.

**Features:**
- Displays `basishacks_2026` as the site title
- Navigation menu with conditional items based on user role and hackathon status
- Color mode toggle button
- User avatar link to `/profile` (or a generic account icon when logged out)

**Conditional navigation items:**

| Item | Condition |
|------|-----------|
| Home | Always visible |
| Dashboard (with children: Overview, General, Teams, Results) | Always visible |
| Showcase | Always visible |
| Judging | User is judge/admin **and** hackathon status is `voting` |
| Voting | User is participant with a team **and** hackathon status is `voting` |

Permission checks use `hasPermission()` from `~~/shared/permissions`.

```vue
<RoleHeader />
```

### Footer

**File:** `app/components/Footer.vue`

Site-wide footer using `UFooter`. Contains three sections:

| Section | Content |
|---------|---------|
| Left | Copyright notice (auto-updates year), link to contributing page, link to developer portal |
| Center | Navigation links to [biszweb.club](https://biszweb.club/club_sites/developers_club) and [binj.dev](https://binj.dev) |
| Right | Microsoft Teams button (inline SVG), GitHub button linking to the repository |

```vue
<Footer />
```

## Project & Team Forms

### ProjectForm

**File:** `app/components/ProjectForm.vue`

Edit/submit project details with auto-save functionality. Used on the dashboard general page.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `team` | `APITeam \| null \| undefined` | — | The team whose project is being edited |
| `disabled` | `boolean` | `false` | Disables all form fields |

**Events:**

| Event | Payload | Description |
|-------|---------|-------------|
| `dirty` | `boolean` | Emitted when form dirty state changes |
| `refresh` | — | Emitted after a successful save or submit |

**Auto-save:** Runs every **10 seconds** via `setInterval`. Only saves when the form is dirty and a team exists. Sends a `PATCH` to `/api/teams/{id}`.

**Form fields:**
- Project name (`project.name`)
- Project description (`project.description`) — textarea with guidance template
- Demo URL (`project.demo_url`)
- Repository URL (`project.repo_url`)
- Pathway (`pathway`) — radio group: Junior / Senior

**Validation:** Uses `UpdateTeamRequest` schema for save, `SubmitTeamRequest` schema for submit (both from `~~/shared/schemas`).

**Submit flow:** Clicking "Submit" shows a `ModalConfirm` dialog warning that changes cannot be made after submission.

```vue
<ProjectForm :team="team" :disabled="isSubmitted" @dirty="onDirty" @refresh="refreshData" />
```

### TeamForm

**File:** `app/components/TeamForm.vue`

Team management component for renaming, adding, and removing members.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `team` | `APITeam` | The team to manage |
| `disabled` | `boolean` | Disables all actions |

**Events:**

| Event | Payload | Description |
|-------|---------|-------------|
| `refresh` | — | Emitted after any mutation (rename, add, remove) |

**Features:**
- **Rename team** — Opens a `UModal` with a form validated by `UpdateTeamRequest`
- **Add member** — Opens a `UModal` with an email field validated by `AddTeamMemberRequest`
- **Remove member** — Each member card has a `ModalConfirm` button; self-removal triggers a "leave" message, and removing the last member warns about team deletion

```vue
<TeamForm :team="team" :disabled="submitted" @refresh="refreshData" />
```

## Scoring & Voting

### JudgingCard

**File:** `app/components/JudgingCard.vue`

Judge scoring card for evaluating a team's project against rubric criteria.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `team` | `APITeam` | The team being judged |

**Events:**

| Event | Payload | Description |
|-------|---------|-------------|
| `scored` | — | Emitted after successful score submission |

**Scoring interface:**
- Displays project name, team name, pathway, description, AI sourcing statement, and repo/demo links
- For each rubric criterion (from `~~/shared/rubric`), shows abbreviation, weight percentage, description tooltip, and a `URadioGroup` with values **0–5**
- Reasoning textarea for score justification
- Submit requires browser `confirm()` dialog

**Validation:** Uses `CreateTeamScoresRequest` schema. Posts to `/api/teams/{id}/scores`.

```vue
<JudgingCard :team="team" @scored="onScored" />
```

### VotingProjectCard

**File:** `app/components/VotingProjectCard.vue`

Read-only card displaying a project for peer voting. Shows project name, description, and repo/demo links.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `project` | `APITeam['project']` | The project to display |

```vue
<VotingProjectCard :project="project" />
```

## Results & Display

### ResultCard

**File:** `app/components/ResultCard.vue`

Season results card with metallic shimmer effects for top placements.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `team` | `GetTeamResponse` | The team with score and rank data |

**Visual effects:**

| Rank | CSS Class | Effect |
|------|-----------|--------|
| #1 | `metallic-gold` | Gold gradient shimmer animation |
| #2 | `metallic-silver` | Silver gradient shimmer animation |
| #3 | `metallic-bronze` | Bronze gradient shimmer animation |
| Score = 800 | `rainbow-once` | One-time rainbow sweep animation |

The card displays season date and name (from `~~/shared/seasons`), score out of 800, ranking, team name, and member avatars via `UserAvatarGroup`.

```vue
<ResultCard :team="team" />
```

### ResultsCard

**File:** `app/components/ResultsCard.vue`

Simpler results card showing ranked project with name, team, description, and links. Used in judge/admin views.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `team` | `APITeam` | The team data |
| `rank` | `number \| null` | The team's ranking |

```vue
<ResultsCard :team="team" :rank="rank" />
```

### ResultsProjectLinks

**File:** `app/components/ResultsProjectLinks.vue`

Icon-based project link buttons for GitHub, demo, and video. The video button opens a `PopupMediaBrowser` with an embedded video player.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `githubLink` | `string` | GitHub repository URL |
| `demoLink` | `string` | Demo URL |
| `videoLink` | `string` | Video URL |

```vue
<ResultsProjectLinks github-link="..." demo-link="..." video-link="..." />
```

### ProjectCard

**File:** `app/components/ProjectCard.vue`

Fetches and displays a team's project card by ID. Shows project name, team name, description, and repo/demo links.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `id` | `number` | The team ID to fetch |

```vue
<ProjectCard :id="teamId" />
```

## Avatar System

### UserAvatar

**File:** `app/components/UserAvatar.vue`

Single user avatar with skeleton loading state. Resolves the image source from the user's `profile_picture` field (served from `/userast/`).

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `user` | `object \| null \| undefined` | — | User object with `name`, `email`, `profile_picture` |
| `previewSrc` | `string` | — | Override source (e.g., for upload preview) |
| `size` | `'3xs' \| '2xs' \| 'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| '3xl'` | `'md'` | Avatar size |

When `user` is `null`, renders a `USkeleton` placeholder.

```vue
<UserAvatar :user="user" size="sm" />
```

### UserAvatarGroup

**File:** `app/components/UserAvatarGroup.vue`

Renders multiple `UserAvatar` components in a `UAvatarGroup` with a hover popover listing all users.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `users` | `Array` | — | Array of user objects |
| `size` | `string` | — | Avatar size (passed through) |
| `max` | `number \| string` | — | Maximum visible avatars |

The popover contains a scrollable list of `UserItem` components.

```vue
<UserAvatarGroup :users="members" :max="5" size="md" />
```

### UserItem

**File:** `app/components/UserItem.vue`

Combines a `UserAvatar` with the user's name and email text. Used inside popovers and lists.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `user` | `object \| null \| undefined` | — | User object |
| `size` | `string` | `'md'` | Avatar size |

```vue
<UserItem :user="user" size="sm" />
```

### UserPopover

**File:** `app/components/UserPopover.vue`

Hover-triggered popover that lazy-loads full user data on first hover. Shows the user's profile theme banner (if set) and `UserItem`.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `user` | `number \| APIUser` | User ID (lazy fetch) or full user object |

**Lazy loading:** If `user` is a number, fetches `/api/users/{id}` on first hover. Shows skeleton placeholders during loading. Caches the result after first fetch.

```vue
<UserPopover :user="userId">
  <span>Hover to see profile</span>
</UserPopover>
```

## Countdown & Loading

### LargeCountdown

**File:** `app/components/LargeCountdown.vue`

Full-width countdown timer with days, hours, minutes, and seconds.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `date` | `Date` | Target date to count down to |
| `label` | `string` | Label text above the timer |

Updates every second via `setInterval`. Displays a formatted `DateTime` below the countdown. Styled with a dashed primary-colored border.

```vue
<LargeCountdown :date="startDate" label="Hackathon starts" />
```

### LoaderAnimation

**File:** `app/components/LoaderAnimation.vue`

Full-screen overlay loader with an animated infinity SVG symbol and "Just a moment" text. Uses a fade transition.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `show` | `boolean` | Whether to display the loader |

The SVG animation features a looping stroke-dash animation on an infinity path, with shadow effects and a slow rotation.

```vue
<LoaderAnimation :show="isLoading" />
```

### LoaderAnimationInline

**File:** `app/components/LoaderAnimationInline.vue`

Inline version of the infinity SVG loader (same animation, no overlay). Used inside page content areas.

```vue
<LoaderAnimationInline />
```

## Utility Components

### ModalConfirm

**File:** `app/components/ModalConfirm.vue`

Reusable confirmation modal wrapping `UModal`.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `color` | `string` | `'primary'` | Color of the confirm button |
| `click` | `Function` | `() => {}` | Callback on confirm |
| `colorSecond` | `string` | `'neutral'` | Color of the cancel button |

**Slots:**
- Default — trigger element (e.g., a button)
- `content` — modal body content

**v-model:** Supports `v-model:open` for programmatic control.

```vue
<ModalConfirm v-model:open="show" title="Confirm" color="error" :click="onConfirm">
  <UButton>Delete</UButton>
  <template #content>Are you sure?</template>
</ModalConfirm>
```

### PopupMediaBrowser

**File:** `app/components/PopupMediaBrowser.vue`

Modal-based media preview browser wrapping `UModal`.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `'Media preview'` | Modal title |
| `buttonLabel` | `string` | `'Open media'` | Default trigger button text |
| `buttonIcon` | `string` | `'i-material-symbols-open-in-new'` | Trigger button icon |
| `buttonVariant` | `string` | `'ghost'` | Trigger button variant |
| `disabled` | `boolean` | `false` | Disables the trigger |

**Slots:**
- `trigger` — custom trigger element
- `buttonLabel` — custom button label
- Default (scoped) — receives `close` function for modal content

```vue
<PopupMediaBrowser title="Video" :disabled="!videoLink">
  <template #buttonLabel>Watch</template>
  <template #default="{ close }">
    <video :src="videoLink" controls />
  </template>
</PopupMediaBrowser>
```

### DateTime

**File:** `app/components/DateTime.vue`

Formats a `Date` object as a localized string in the `Asia/Shanghai` timezone.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `date` | `Date` | The date to format |

Uses `date.toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Shanghai' })`. Wrapped in `<ClientOnly>` to avoid hydration mismatches. Renders a `<time>` element with an ISO `datetime` attribute.

```vue
<DateTime :date="startDate" />
```

### GoBackUp

**File:** `app/components/GoBackUp.vue`

Scroll-to-top floating button. Appears when the user scrolls past one viewport height. Uses a fade transition.

```vue
<GoBackUp />
```

### FormRequiredNotification

**File:** `app/components/FormRequiredNotification.vue`

Static helper text indicating required form fields. Displays a red asterisk icon with the message "indicates a field is required."

```vue
<FormRequiredNotification />
```

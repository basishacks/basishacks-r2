---
title: Components
description: Vue components used across the basishacks frontend — navigation, forms, scoring, avatars, awards, and visual effects.
---

# Components

The basishacks frontend contains **25 Vue components** organized in `app/components/`. All components use `<script setup lang="ts">` and the `@nuxt/ui` component library.

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
| --- | --- |
| Home | Always visible |
| Dashboard (with children: Overview, General, Teams, Results) | Always visible |
| Showcase | Always visible |
| Voting | Hackathon status is `voting` and user is not a judge or admin |
| Judging | User is a judge or admin, and hackathon status is `voting` |

Permission checks use `hasPermission()` from `~~/shared/permissions`.

```vue
<RoleHeader />
```

### Footer

**File:** `app/components/Footer.vue`

Site-wide footer using `UFooter`. Contains three sections:

| Section | Content |
| --- | --- |
| Left | Copyright notice (auto-updates year), link to the contributing page, and link to the developer portal |
| Center | Navigation links to [biszweb.club](https://biszweb.club/club_sites/developers_club) and [binj.dev](https://binj.dev) |
| Right | Microsoft Teams button (inline SVG) and GitHub button linking to the repository |

```vue
<Footer />
```

### TeamsIcon

**File:** `app/components/TeamsIcon.vue`

Inline SVG component for the Microsoft Teams icon used in the footer and user popover. Renders the official Teams logo with gradient fills at a default size of `w-6 h-6`.

```vue
<TeamsIcon />
```

## Project & Team Forms

### ProjectForm

**File:** `app/components/ProjectForm.vue`

Edit and submit project details with auto-save functionality. Used on the dashboard general page.

**Props:**

| Prop       | Type                           | Default | Description                            |
| ---------- | ------------------------------ | ------- | -------------------------------------- |
| `team`     | `APITeam \| null \| undefined` | —       | The team whose project is being edited |
| `disabled` | `boolean`                      | `false` | Disables all form fields               |

**Events:**

| Event     | Payload   | Description                               |
| --------- | --------- | ----------------------------------------- |
| `dirty`   | `boolean` | Emitted when form dirty state changes     |
| `refresh` | —         | Emitted after a successful save or submit |

**Auto-save:** Runs every **10 seconds** via `setInterval`. Only saves when the form is dirty and a team exists. Sends a `PATCH` request to `/api/teams/{id}`.

**Form fields:**

- Project name (`project.name`)
- Project description (`project.description`) — textarea with guidance template
- Demo URL (`project.demo_url`)
- Repository URL (`project.repo_url`)
- Pathway (`pathway`) — radio group: Junior / Senior

**Validation:** Uses `UpdateTeamRequest` for saves and `SubmitTeamRequest` for submissions (both from `~~/shared/schemas`).

**Submit flow:** Clicking "Submit" sets the intent to `submit` and shows a `ModalConfirm` dialog warning that changes cannot be made after submission.

```vue
<ProjectForm :team="team" :disabled="isSubmitted" @dirty="onDirty" @refresh="refreshData" />
```

### TeamForm

**File:** `app/components/TeamForm.vue`

Team management component for renaming, adding, and removing members.

**Props:**

| Prop       | Type      | Description          |
| ---------- | --------- | -------------------- |
| `team`     | `APITeam` | The team to manage   |
| `disabled` | `boolean` | Disables all actions |

**Events:**

| Event     | Payload | Description                                      |
| --------- | ------- | ------------------------------------------------ |
| `refresh` | —       | Emitted after any mutation (rename, add, remove) |

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

| Prop   | Type      | Description           |
| ------ | --------- | --------------------- |
| `team` | `APITeam` | The team being judged |

**Events:**

| Event    | Payload | Description                               |
| -------- | ------- | ----------------------------------------- |
| `scored` | —       | Emitted after successful score submission |

**Scoring interface:**

- Displays project name, team name, pathway badge, description rendered with `Comark`, AI sourcing statement in a `UAlert`, and repo/demo links
- For each rubric criterion (from `~~/shared/rubric`), shows abbreviation, weight percentage, description tooltip, and a `URadioGroup` with values **0–5**
- Reasoning textarea for score justification
- Submit requires a browser `confirm()` dialog

**Validation:** Uses `CreateTeamScoresRequest`. Posts to `/api/teams/{id}/scores`.

```vue
<JudgingCard :team="team" @scored="onScored" />
```

### VotingProjectCard

**File:** `app/components/VotingProjectCard.vue`

Interactive card displaying a project for peer voting. Shows project name, team name, pathway badge, description rendered with `Comark`, and repo/demo links, plus star increment and decrement controls.

**Props:**

| Prop           | Type      | Description                           |
| -------------- | --------- | ------------------------------------- |
| `team`         | `APITeam` | The team/project to display           |
| `score`        | `number`  | Current star count for this project   |
| `canIncrement` | `boolean` | Whether the user can add another star |
| `canDecrement` | `boolean` | Whether the user can remove a star    |

**Emits:**

| Event       | Description                       |
| ----------- | --------------------------------- |
| `increment` | User clicked the increment button |
| `decrement` | User clicked the decrement button |

```vue
<VotingProjectCard
    :team="team"
    :score="state.scores[index]"
    :can-increment="state.scores[index] < 5 && totalStars < 10"
    :can-decrement="state.scores[index] > 0"
    @increment="increment(index)"
    @decrement="decrement(index)"
/>
```

## Results & Display

### ScoreCard

**File:** `app/components/ScoreCard.vue`

Primary results card used on the dashboard results page. Displays season results with metallic shimmer effects for top placements.

**Props:**

| Prop   | Type              | Description                       |
| ------ | ----------------- | --------------------------------- |
| `team` | `GetTeamResponse` | The team with score and rank data |

**Visual effects:**

| Rank        | CSS Class         | Effect                            |
| ----------- | ----------------- | --------------------------------- |
| #1          | `metallic-gold`   | Gold gradient shimmer animation   |
| #2          | `metallic-silver` | Silver gradient shimmer animation |
| #3          | `metallic-bronze` | Bronze gradient shimmer animation |
| Score = 800 | `rainbow-once`    | One-time rainbow sweep animation  |

The card displays season date and name (from `~~/shared/seasons`), score out of 800, ranking, team name, pathway badge, member avatars via `UserAvatarGroup`, awarded badges via `AwardButton`, and a link to season details. A modal trigger renders the full project inside a `ProjectCard`. When a project has not been submitted, the score and rank are blurred with an overlay message.

```vue
<ScoreCard :team="team" />
```

### JudgeProgressCard

**File:** `app/components/JudgeProgressCard.vue`

Compact card showing judging progress for a single season: how many projects have been scored versus how many were submitted.

**Props:**

| Prop     | Type                | Description                                              |
| -------- | ------------------- | -------------------------------------------------------- |
| `season` | `BallotSummaryItem` | Season summary with `submitted_count` and `scored_count` |

```vue
<JudgeProgressCard :season="season" />
```

### ShowcaseMarqueeCard

**File:** `app/components/ShowcaseMarqueeCard.vue`

Horizontal scroll card used in the showcase marquee. Displays project rank, pathway badge, and awarded badges. Applies metallic gradient text for ranks 1–3, and renders "Unranked" otherwise.

**Props:**

| Prop   | Type              | Description         |
| ------ | ----------------- | ------------------- |
| `team` | `GetTeamResponse` | The team to display |

**Emits:**

| Event   | Description                    |
| ------- | ------------------------------ |
| `click` | Fired when the card is clicked |

```vue
<ShowcaseMarqueeCard :team="team" @click="openDetail(team)" />
```

### ProjectCard

**File:** `app/components/ProjectCard.vue`

Fetches and displays a team's project card by ID. Shows project name, team name, description rendered with `Comark`, repo/demo links, and awarded badges via `AwardButton`.

**Props:**

| Prop | Type     | Description          |
| ---- | -------- | -------------------- |
| `id` | `number` | The team ID to fetch |

```vue
<ProjectCard :id="teamId" />
```

### ResultsProjectLinks

**File:** `app/components/ResultsProjectLinks.vue`

Icon-based project link buttons for GitHub, demo, and video. The video button opens a `PopupMediaBrowser` with an embedded video player.

**Props:**

| Prop         | Type     | Description           |
| ------------ | -------- | --------------------- |
| `githubLink` | `string` | GitHub repository URL |
| `demoLink`   | `string` | Demo URL (optional)   |
| `videoLink`  | `string` | Video URL             |

```vue
<ResultsProjectLinks github-link="..." demo-link="..." video-link="..." />
```

## Awards

### AwardButton

**File:** `app/components/AwardButton.vue`

Tooltip button that renders an award icon and description. Maps award colors (`gold`, `silver`, `bronze`, or default) to `@nuxt/ui` button colors.

**Props:**

| Prop    | Type      | Description            |
| ------- | --------- | ---------------------- |
| `award` | `APIAward` | The award to display   |
| `size`  | `any`     | Button size to apply   |

```vue
<AwardButton :award="award" size="md" />
```

## Avatar System

### UserAvatar

**File:** `app/components/UserAvatar.vue`

Single user avatar with skeleton loading state. Resolves the image source from the user's `profile_picture` field (served from `/userast/`).

**Props:**

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
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

| Prop    | Type               | Default | Description                  |
| ------- | ------------------ | ------- | ---------------------------- |
| `users` | `Array`            | —       | Array of user objects        |
| `size`  | `string`           | —       | Avatar size (passed through) |
| `max`   | `number \| string` | —       | Maximum visible avatars      |
| `class` | `any`              | —       | Classes passed to the group  |
| `ui`    | `any`              | —       | UI overrides for the group   |

The popover contains a scrollable list of `UserItem` components.

```vue
<UserAvatarGroup :users="members" :max="5" size="md" />
```

### UserItem

**File:** `app/components/UserItem.vue`

Combines a `UserAvatar` with the user's name and email text. Used inside popovers and lists.

**Props:**

| Prop   | Type                          | Default | Description |
| ------ | ----------------------------- | ------- | ----------- |
| `user` | `object \| null \| undefined` | —       | User object |
| `size` | `string`                      | `'md'`  | Avatar size |

```vue
<UserItem :user="user" size="sm" />
```

### UserPopover

**File:** `app/components/UserPopover.vue`

Hover-triggered popover that lazy-loads full user data on first hover. Shows the user's profile theme banner (if set), `UserItem`, an email copy button, and a "Chat on Teams" action.

**Props:**

| Prop       | Type                | Description                                                              |
| ---------- | ------------------- | ------------------------------------------------------------------------ |
| `user`     | `number \| APIUser` | User ID (lazy fetch) or full user object                                 |
| `external` | `boolean`           | When true, shows an indicator that the user is not registered in basishacks |

**Lazy loading:** If `user` is a number, fetches `/api/users/{id}` on first hover. Shows skeleton placeholders during loading. Caches the result after the first fetch.

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

| Prop    | Type     | Description                  |
| ------- | -------- | ---------------------------- |
| `date`  | `Date`   | Target date to count down to |
| `label` | `string` | Label text above the timer   |

Updates every second via `setInterval`. Displays a formatted `DateTime` below the countdown. Styled with a dashed primary-colored border.

```vue
<LargeCountdown :date="startDate" label="Hackathon starts" />
```

### LoaderAnimation

**File:** `app/components/LoaderAnimation.vue`

Full-screen overlay loader with an animated infinity SVG symbol and "Just a moment" text. Uses a fade transition.

**Props:**

| Prop   | Type      | Description                   |
| ------ | --------- | ----------------------------- |
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

| Prop          | Type       | Default     | Description                 |
| ------------- | ---------- | ----------- | --------------------------- |
| `color`       | `string`   | `'primary'` | Color of the confirm button |
| `click`       | `Function` | `() => {}`  | Callback on confirm         |
| `colorSecond` | `string`   | `'neutral'` | Color of the cancel button  |

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

| Prop            | Type      | Default                            | Description                 |
| --------------- | --------- | ---------------------------------- | --------------------------- |
| `title`         | `string`  | `'Media preview'`                  | Modal title                 |
| `buttonLabel`   | `string`  | `'Open media'`                     | Default trigger button text |
| `buttonIcon`    | `string`  | `'i-material-symbols-open-in-new'` | Trigger button icon         |
| `buttonVariant` | `string`  | `'ghost'`                          | Trigger button variant      |
| `disabled`      | `boolean` | `false`                            | Disables the trigger        |

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

| Prop   | Type   | Description        |
| ------ | ------ | ------------------ |
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

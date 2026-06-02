# Layouts

The application uses 6 layouts located in `app/layouts/`.

## default

**File**: `app/layouts/default.vue`

The standard page layout with header, centered content container, and footer.

```
┌─────────────────────────────────┐
│          RoleHeader             │
├─────────────────────────────────┤
│                                 │
│     UContainer (centered)       │
│         <slot />                │
│                                 │
├─────────────────────────────────┤
│           Footer                │
└─────────────────────────────────┘
```

Used by: Home, Profile, Judging, Voting, Rules, Debug, User pages

## dashboard

**File**: `app/layouts/dashboard.vue`

Dashboard layout with a sidebar navigation panel and event info card.

```
┌─────────────────────────────────────────┐
│              RoleHeader                 │
├────────────┬────────────────────────────┤
│            │                            │
│  Sidebar   │                            │
│  ┌──────┐  │                            │
│  │Event │  │        <slot />            │
│  │Info  │  │                            │
│  ├──────┤  │                            │
│  │ Nav  │  │                            │
│  │Menu  │  │                            │
│  └──────┘  │                            │
│            │                            │
├────────────┴────────────────────────────┤
│               Footer                    │
└─────────────────────────────────────────┘
```

**Sidebar features:**
- Event info card with theme name and metallic gold shimmer effect
- Vertical navigation menu (Overview, General, Teams, Presentation)
- Guide dropdown
- Hidden on screens narrower than 1800px
- Banner on smaller screens hinting at dashboard tab

Used by: All `/dashboard/*` pages

## developers-dashboard

**File**: `app/layouts/developers-dashboard.vue`

Developer portal layout with a collapsible sidebar using `UDashboardGroup`.

```
┌─────────────────────────────────────────┐
│              <slot />                   │
│  (Content area with sidebar)            │
└─────────────────────────────────────────┘
```

**Sidebar features:**
- Collapsible and resizable
- Navigation items: Home, Users, Teams, Applications, DeepSeek, Files
- Items disabled based on user permissions
- Search button with keyboard shortcut hint (Meta+K)
- Footer shows user avatar and name, linking to `/profile`
- Header shows branding

Used by: All `/developers/*` pages

## fullwidth

**File**: `app/layouts/fullwidth.vue`

Full-width layout without the centered container constraint.

```
┌─────────────────────────────────┐
│          RoleHeader             │
├─────────────────────────────────┤
│                                 │
│        <slot /> (full width)    │
│                                 │
├─────────────────────────────────┤
│           Footer                │
└─────────────────────────────────┘
```

Used by: Public user profile page (`/user/:id`)

## fullwidth-nostick

**File**: `app/layouts/fullwidth-nostick.vue`

Same as `fullwidth` but the header is positioned relatively (not sticky).

```
┌─────────────────────────────────┐
│   RoleHeader (relative)         │
├─────────────────────────────────┤
│                                 │
│        <slot /> (full width)    │
│                                 │
├─────────────────────────────────┤
│           Footer                │
└─────────────────────────────────┘
```

Used by: Results page (`/results`)

## default-background

**File**: `app/layouts/default-background.vue`

Variant of the default layout with a red-tinted background on the main content area.

Same structure as `default` but `UMain` has `class="bg-red-100"`.

Used by: Currently unused (available for special/admin pages)

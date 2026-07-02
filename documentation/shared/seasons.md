---
title: Seasons
description: Static season metadata and active-season management.
---

# Seasons

Hackathon seasons are defined by static metadata and activated through the database/API. Each team is linked to a season via the `season_id` foreign key.

## Season Metadata

`shared/seasons.ts` exports a static map of seasons:

```ts
export interface HackathonSeason {
  id: number
  theme_name: string | null
  theme_description: string | null
  date: string | null
  docs: string | null
}
```

Example:

```ts
const hackathonSeasons: Record<number, HackathonSeason> = {
  2: {
    id: 2,
    theme_name: 'Signal',
    theme_description: 'signal',
    date: 'February 2026',
    docs: 'https://slack-files.com/T09V59WQY1E-F0A8LUTHZHQ-0eb4891888',
  },
  1: {
    id: 1,
    theme_name: 'Beneath the Surface',
    theme_description: 'Explore the hidden depths of our world',
    date: 'May 2026',
    docs: null,
  },
}
```

::: info
Season metadata is checked into source control. To add a new season, edit `shared/seasons.ts` and redeploy.
:::

## Active Season

The database tracks the currently active season in the `hackathon` table (`active_season_id`). Only one season can be active at a time.

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/seasons` | `PORTAL_SEASONS_VIEW` or admin | List all seasons |
| GET | `/api/seasons/active` | None | Get the currently active season |
| PATCH | `/api/seasons/active` | `PORTAL_SEASONS_EDIT` or admin | Set the active season |

`PATCH /api/seasons/active` accepts `SetActiveSeasonRequest`:

```ts
{
  season_id: number | null
}
```

Passing `null` deactivates all seasons.

### Database Helpers

`server/utils/database/seasons.ts` provides:

| Function | Description |
|----------|-------------|
| `getSeasons(event)` | List all seasons ordered by ID |
| `getSeasonById(event, seasonId)` | Get a season by ID |
| `getActiveSeason(event)` | Get the currently active season |
| `setActiveSeason(event, seasonId)` | Activate one season and deactivate all others |

## Usage in the UI

- The home page (`/`) fetches the active season to display the theme, date, and schedule.
- The dashboard sidebar shows the active season's theme and date.
- The results page (`/dashboard/results`) uses `ScoreCard`, which pulls season metadata from `shared/seasons.ts` to display the season name and date.

## Source Files

- `shared/seasons.ts` — static season metadata
- `shared/schemas.ts` — `SetActiveSeasonRequest`
- `server/utils/database/seasons.ts` — database helpers
- `server/api/seasons/index.get.ts`
- `server/api/seasons/active.get.ts`
- `server/api/seasons/active.patch.ts`
- `app/pages/developers/seasons.vue`

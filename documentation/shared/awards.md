---
title: Awards System
description: How team awards are defined, stored, and returned in API responses.
---

# Awards System

Team awards are a lightweight way to recognize special achievements (for example, a perfect judge score). Award definitions live in shared code, while per-team award assignments are stored in the database.

## Award Definition

The `Award` interface in `shared/awards.ts` describes an award:

```ts
export interface Award {
    namespace: string;
    name: string;
    description: string;
    icon: string;
    computed?: (meta: Record<string, unknown>) => string[];
}
```

| Field         | Description                                                               |
| ------------- | ------------------------------------------------------------------------- |
| `namespace`   | Unique machine-readable identifier                                        |
| `name`        | Human-readable display name                                               |
| `description` | Short explanation of how the award is earned                              |
| `icon`        | Iconify icon class                                                        |
| `computed`    | Optional function that derives extra display strings from stored metadata |

## Registry

Awards are registered in `AWARD_REGISTRY`:

```ts
export const AWARD_REGISTRY: Record<string, Award> = {
    perfect_score: {
        namespace: "perfect_score",
        name: "Flawless",
        description: "Achieve a perfect score from all judges.",
        icon: "i-lucide-gem",
    },
};
```

Only `perfect_score` is currently defined. Adding a new award only requires adding an entry to the registry; no schema changes are needed.

## API Representation

Awards are returned as part of `APITeam` via the `APIAward` interface:

```ts
interface APIAward {
    namespace: string;
    name: string;
    meta: Record<string, unknown>;
    text: string;
}
```

`APITeam.awards` is an array of `APIAward` objects. The `convertTeamToPublic` helper resolves award metadata using `server/utils/database/awards.ts`.

## Database Helpers

`server/utils/database/awards.ts` provides the following functions:

| Function                                  | Description                            |
| ----------------------------------------- | -------------------------------------- |
| `getAwards(event, teamId)`                | Get resolved awards for a single team  |
| `getAwardsForTeams(event, teamIds)`       | Get resolved awards for multiple teams |
| `createAward(event, teamId, award, meta)` | Create a team award                    |
| `deleteTeamAwards(event, teamId)`         | Delete all awards for a team           |
| `deleteAward(event, teamId, award)`       | Delete a specific award for a team     |

Award storage uses the `team_awards` table with columns `team_id`, `award`, and `meta` (JSON).

## Source Files

- `shared/awards.ts` — award definitions
- `shared/responses.d.ts` — `APIAward` interface
- `server/utils/database/awards.ts` — database helpers
- `server/utils/convert.ts` — resolves awards when converting teams

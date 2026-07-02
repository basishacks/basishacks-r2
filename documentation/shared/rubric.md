---
title: Judging Rubric
description: Rubric criteria, weightings, and scoring system for judge evaluation
---

# Judging Rubric

The rubric system defines the criteria and weightings used by judges to score team projects. Each pathway (junior and senior) has the same five criteria but with different weightings to reflect different priorities.

::: info Source Files

- `shared/rubric.ts` — Rubric definitions
- `shared/seasons.ts` — Season definitions :::

## RubricData Interface

Each criterion is defined by the `RubricData` interface:

```ts
export interface RubricData {
    abbr: string; // Short abbreviation (e.g., 'ORG')
    name: string; // Full criterion name
    description: string; // One-line description
    weight: number; // Percentage weight (must sum to 100 per pathway)
}
```

## Junior Pathway

The junior pathway prioritizes **innovation and originality**, reflecting the expectation that younger participants should demonstrate creativity.

| Criterion | Abbr | Name | Weight | Description |
| --- | --- | --- | --- | --- |
| `originality` | ORG | Innovation & Originality | **30%** | Novelty of idea and approach. |
| `presentation` | PRE | Presentation & Design | **25%** | Clarity, polish, and design of demo. |
| `technicality` | TEC | Technical Complexity | **20%** | Depth and quality of technical implementation. |
| `theme` | THM | Theme Alignment | **15%** | How clearly the project relates to the theme. |
| `impact` | IMP | Impact & Usefulness | **10%** | Potential to solve real problems or benefit users. |

**Total: 100%**

## Senior Pathway

The senior pathway prioritizes **impact and usefulness**, reflecting the expectation that older participants should build practical solutions.

| Criterion | Abbr | Name | Weight | Description |
| --- | --- | --- | --- | --- |
| `impact` | IMP | Impact & Usefulness | **30%** | Potential to solve real problems or benefit users. |
| `presentation` | PRE | Presentation & Design | **25%** | Clarity, polish, and design of demo. |
| `technicality` | TEC | Technical Complexity | **20%** | Depth and quality of technical implementation. |
| `theme` | THM | Theme Alignment | **15%** | How clearly the project relates to the theme. |
| `originality` | ORG | Innovation & Originality | **10%** | Novelty of idea and approach. |

**Total: 100%**

## Score Range

<AnimatedCounter :target="5" suffix="max points" />

Each criterion is scored on a **0–5 integer scale**:

| Score | Meaning                 |
| ----- | ----------------------- |
| 0     | Not evaluated / missing |
| 1     | Poor                    |
| 2     | Below average           |
| 3     | Average                 |
| 4     | Above average           |
| 5     | Excellent               |

This is enforced by the `ZeroToFive` Zod schema in `shared/schemas.ts`:

```ts
const ZeroToFive = z.number().int().min(0).max(5);
```

## Weighted Score Calculation

A team's final score is calculated as:

```
finalScore = Σ (criterionScore × weight / 100) × 20
```

Where `criterionScore` is 0–5 and `weight` is the percentage for that criterion in the team's pathway. The `× 20` factor normalizes the result to a 0–100 scale.

**Example (Junior pathway):**

| Criterion    | Score | Weight | Weighted        |
| ------------ | ----- | ------ | --------------- |
| originality  | 4     | 30%    | 4 × 0.30 = 1.20 |
| presentation | 5     | 25%    | 5 × 0.25 = 1.25 |
| technicality | 3     | 20%    | 3 × 0.20 = 0.60 |
| theme        | 4     | 15%    | 4 × 0.15 = 0.60 |
| impact       | 3     | 10%    | 3 × 0.10 = 0.30 |

```
rawSum = 1.20 + 1.25 + 0.60 + 0.60 + 0.30 = 3.95
finalScore = 3.95 × 20 = 79
```

## Seasons

Seasons are defined in `shared/seasons.ts` using the `HackathonSeason` interface:

```ts
interface HackathonSeason {
    id: number;
    theme_name: string | null;
    theme_description: string | null;
    date: string | null;
    docs: string | null;
}
```

### Defined Seasons

| ID  | Theme Name          | Date          | Description                            |
| --- | ------------------- | ------------- | -------------------------------------- |
| 1   | Beneath the Surface | May 2026      | Explore the hidden depths of our world |
| 2   | Signal              | February 2026 | signal                                 |

The active season is tracked in the `hackathon` table and can be set via `PATCH /api/seasons/active`.

## Related Schemas

- `CreateTeamScoresRequest` — validates judge scoring input (reasoning + ScoreValues)
- `ScoreValues` — dynamically generated object schema from rubric criteria keys
- `SubmitVoteRequest` — validates peer voting (scores must sum to 10)

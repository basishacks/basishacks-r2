# Rubric System

The judging rubric is defined in `shared/rubric.ts` and provides the scoring criteria for both junior and senior pathways.

## RubricData Interface

```typescript
interface RubricData {
  abbr: string      // Abbreviation (e.g., 'ORG')
  name: string      // Full criterion name
  description: string  // Brief description
  weight: number    // Percentage weight (must sum to 100)
}
```

## Junior Pathway

| Criterion | Abbr | Weight | Description |
|-----------|------|--------|-------------|
| Innovation & Originality | ORG | 30% | Novelty of idea and approach |
| Presentation & Design | PRE | 25% | Clarity, polish, and design of demo |
| Technical Complexity | TEC | 20% | Depth and quality of technical implementation |
| Theme Alignment | THM | 15% | How clearly the project relates to the theme |
| Impact & Usefulness | IMP | 10% | Potential to solve real problems or benefit users |

## Senior Pathway

| Criterion | Abbr | Weight | Description |
|-----------|------|--------|-------------|
| Impact & Usefulness | IMP | 30% | Potential to solve real problems or benefit users |
| Presentation & Design | PRE | 25% | Clarity, polish, and design of demo |
| Technical Complexity | TEC | 20% | Depth and quality of technical implementation |
| Theme Alignment | THM | 15% | How clearly the project relates to the theme |
| Innovation & Originality | ORG | 10% | Novelty of idea and approach |

## Key Differences

The junior pathway prioritizes **innovation and originality** (30%), while the senior pathway prioritizes **impact and usefulness** (30%). This reflects the expectation that senior projects should demonstrate practical value, while junior projects are encouraged to be creative.

## Score Calculation

Each criterion is scored 0–5 by judges. The final score is calculated as:

```
weighted_score = Σ (criterion_score × weight / 100)
percentage = (weighted_score / 5) × 100
```

The overall team score combines peer voting (25%) and judge scores (75%):

```
final_score = (peer_score × 0.25) + (judge_score × 0.75)
```

## Usage in Code

The rubric is used by:

1. **`JudgingCard` component** — dynamically builds the scoring form based on the team's pathway
2. **`CreateTeamScoresRequest` schema** — validates that scores match the rubric criteria keys
3. **`GET /api/admin/scores`** — calculates weighted scores for each team

```typescript
import rubrics from '~~/shared/rubric'

// Get criteria for a pathway
const criteria = rubrics.junior // or rubrics.senior

// Iterate over criteria
for (const [key, data] of Object.entries(criteria)) {
  console.log(`${data.abbr} - ${data.name} (${data.weight}%)`)
}
```

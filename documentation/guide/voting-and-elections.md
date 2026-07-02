---
title: Voting & Elections
description: How peer voting and student-council election voting work in basishacks.
---

# Voting & Elections

basishacks supports two separate voting systems:

1. **Peer Voting** — participants distribute stars across hackathon projects during the `voting` phase.
2. **Election Voting** — ranked-choice ballots for student-council positions using instant-runoff voting (IRV).

Both systems are independent, use different data tables, and are gated by the current hackathon state and user permissions.

---

## Peer Voting

Peer voting opens when the global `hackathon.status` is set to `voting`. Only participants with a submitted project can vote, and they can only vote on eligible projects in the **same pathway** (`junior` or `senior`).

### Eligibility Rules

| Requirement | Reason |
|-------------|--------|
| User is authenticated | `requireUser(event)` |
| User belongs to a team | `user.team_id` must be set |
| User's team has submitted a project | `team.project_submitted = 1` |
| Target project is submitted | Fetched via `getSubmittedTeams` |
| Target project is in the same pathway | `p.pathway === userTeam.pathway` |
| User cannot vote for their own team | `p.id !== user.team_id` |

### The 10-Star Rule

Each voter has **exactly 10 stars** to distribute among eligible projects. A single project can receive **0–5 stars**. The `SubmitVoteRequest` Zod schema enforces:

```ts
scores.reduce((a, b) => a + b, 0) === 10
```

::: warning
If the total is not exactly 10, the server rejects the ballot with a validation error.
:::

### Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────────┐
│  /voting    │     │  /api/ballot │     │  peer_voting_scores │
│   page      │────►│   (GET/POST) │────►│      table          │
└─────────────┘     └──────────────┘     └─────────────────────┘
```

1. The frontend fetches the ballot from `GET /api/ballot`.
2. The server returns eligible projects, any previously saved scores, and optional reasoning.
3. The user adjusts scores with increment/decrement buttons.
4. On submit, `POST /api/ballot` validates the request and upserts a row in `peer_voting_scores` via `server/utils/database/peer-voting.ts`.

### Ballot Response

`GET /api/ballot` returns a `GetBallotResponse`:

| Field | Type | Description |
|-------|------|-------------|
| `submitted` | `boolean` | Whether the user has already voted |
| `projects` | `APITeam[]` | Eligible projects to vote on |
| `scores` | `number[]` | Current star distribution (parallel to `projects`) |
| `reasoning` | `string \| null` | Optional voter reasoning |

### UI

The `/voting` page renders `VotingProjectCard` components for each eligible project. The summary panel shows:

- Total stars used (`{{ totalStars }} / 10`)
- Per-project distribution
- A reasoning textarea
- A submit button that is disabled until the total equals 10

---

## Election Voting (Student Council)

The election system uses **instant-runoff voting (IRV)** for ranked-choice ballots. It is defined in `server/utils/election.ts` and exposed through the `/api/election/*` endpoints.

### Positions and Candidates

Positions and candidates are hard-coded in `server/utils/election.ts`:

| Position | Typical Candidate Count |
|----------|------------------------|
| President | 1 |
| Vice President | 3 |
| Treasurer | 6 |
| Secretary | 6 |
| Activities Coordinator | 5 |
| Director of Communications | 4 |

Each candidate has:

| Field | Description |
|-------|-------------|
| `id` | Unique candidate identifier |
| `shortName` | Display name on the ballot |
| `fullName` | Official full name |
| `email` | School email address |

### Voting Flow

1. Voter opens `/temp/vote`.
2. The page fetches candidates from `GET /api/election/candidates`.
3. Voter enters a rank (1 = first preference) for each candidate; empty inputs are treated as abstentions.
4. Pressing <UKbd>X</UKbd> validates the ballot; pressing <UKbd>X</UKbd> again submits if there are no errors.
5. The ballot is stored in the `scVotes` table as a JSON map of `candidate_id → rank`.

### Validation

Both client and server validate:

- Ranks within a position must be unique.
- Ranks must be contiguous starting at 1 (e.g., 1, 2, 3 with no gaps).
- Abstained candidates are ignored.
- Unknown positions or candidate IDs are rejected.

### IRV Tally

`GET /api/election/vote` runs the IRV algorithm:

1. Count only active first-preference votes.
2. If a candidate has more than 50% of valid ballots, they win.
3. Otherwise, eliminate the candidate with the fewest votes and redistribute their ballots to the next active preference.
4. Repeat until a winner emerges or a tie/no-votes condition is reached.

Result statuses:

| Status | Meaning |
|--------|---------|
| `elected` | A candidate won |
| `tie` | Tie for elimination or final two-way tie |
| `no_votes` | No valid ballots for the position |

::: info Results visibility
Full IRV results are only returned after `hackathon.results_open_timestamp`. Before that time, the endpoint returns only the total ballot count with empty positions.
:::

### Admin Tools

- `GET /api/election/vote/all` lists every cast ballot with voter info and decoded choices.
- `DELETE /api/election/vote/:id` deletes a ballot by ID.
- `/temp/vote/all` is the admin UI for viewing and deleting ballots.

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/election/candidates` | `VotePermissions.VOTE` or admin | List positions and candidates |
| POST | `/api/election/vote` | `VotePermissions.VOTE` or admin | Submit a ranked ballot |
| GET | `/api/election/vote` | `VotePermissions.VOTE` or admin | Get IRV results |
| GET | `/api/election/vote/all` | Admin | List all ballots |
| DELETE | `/api/election/vote/:id` | Admin | Delete a ballot |

### Source Files

- `server/utils/election.ts` — positions, candidates, and IRV algorithm
- `server/api/election/candidates.get.ts`
- `server/api/election/vote/index.post.ts`
- `server/api/election/vote/index.get.ts`
- `server/api/election/vote/all.get.ts`
- `server/api/election/vote/[id].delete.ts`
- `app/pages/temp/vote/index.vue`
- `app/pages/temp/vote/all.vue`

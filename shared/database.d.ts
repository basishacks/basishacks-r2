// Database types inferred from Drizzle ORM schema
// These replace the hand-written type definitions that were previously here.
// The canonical types now live in server/database/schema.ts — use Drizzle's
// type inference helpers (typeof, InferSelectModel, InferInsertModel) when
// you need typed row access.

import type { InferSelectModel } from "drizzle-orm";
import type * as schema from "../server/database/schema";

// Drizzle's InferSelectModel gives `string` for text columns, but we need
// literal union types that match the SQL CHECK constraints to maintain
// backward compatibility.
type HackathonStatus = "not_started" | "in_progress" | "voting" | "finished" | "paused";
type TeamPathway = "junior" | "senior";

// Base types inferred from the Drizzle schema.
type HackathonBase = InferSelectModel<typeof schema.hackathon>;
type TeamBase = InferSelectModel<typeof schema.teams>;
type TeamScoresBase = InferSelectModel<typeof schema.teamScores>;
type UserBase = InferSelectModel<typeof schema.users>;
type BallotBase = InferSelectModel<typeof schema.ballots>;
type BallotScoreBase = InferSelectModel<typeof schema.ballotScores>;
type OAuth2ApplicationBase = InferSelectModel<typeof schema.oauth2Applications>;
type TeamAwardBase = InferSelectModel<typeof schema.teamAwards>;
type PeerVotingScoreBase = InferSelectModel<typeof schema.peerVotingScores>;
type SCVoteBase = InferSelectModel<typeof schema.scVotes>;
type SeasonBase = InferSelectModel<typeof schema.seasons>;

// Re-export with narrowed types for columns that have CHECK constraints
// (Drizzle infers `string` for text columns, but we need the literal union).
export type Hackathon = Omit<HackathonBase, "status"> & { status: HackathonStatus };
export type Team = Omit<TeamBase, "pathway"> & { pathway: TeamPathway | null };
export type TeamScores = TeamScoresBase;
export type User = UserBase;
export type Ballot = BallotBase;
export type BallotScore = BallotScoreBase;
export type OAuth2Application = OAuth2ApplicationBase;
export type TeamAward = TeamAwardBase;
export type PeerVotingScore = PeerVotingScoreBase;
export type SCVote = SCVoteBase;
export type Season = SeasonBase;

export type { HackathonStatus, TeamPathway };

<<<<<<< HEAD
// Ambient declarations for backward compatibility — existing code uses
// these types without explicit imports (they were previously declared
// as global interfaces in this file).
declare global {
    type Hackathon = Omit<HackathonBase, "status"> & { status: HackathonStatus };
    type Team = Omit<TeamBase, "pathway"> & { pathway: TeamPathway | null };
    type TeamScores = TeamScoresBase;
    type User = UserBase;
    type Ballot = BallotBase;
    type BallotScore = BallotScoreBase;
    type OAuth2Application = OAuth2ApplicationBase;
    type TeamAward = TeamAwardBase;
    type PeerVotingScore = PeerVotingScoreBase;
    type SCVote = SCVoteBase;
    type Season = SeasonBase;
    type HackathonStatus = "not_started" | "in_progress" | "voting" | "finished" | "paused";
    type TeamPathway = "junior" | "senior";
=======
interface User {
    id: number;
    email: string;
    role: string;
    name: string | null;
    team_id: number | null;
    login_code: string | null;
    login_expiry: number | null;
    profile_theme: string | null;
    profile_picture: string | null;
}

interface Ballot {
    id: number;
    user_id: number;
    reasoning: string | null;
    submitted: number;
}

interface BallotScore {
    id: number;
    ballot_id: number;
    project_id: number;
    score: 1 | 2 | 3 | 4 | 5 | null;
}

interface OAuth2Application {
    client_id: string;
    client_secret: string;
    redirect_uris: string | null;
    permissions: string | null;
    name: string;
    description: string | null;
    proxy_microsoft: number;
    type: "first" | "third";
    profile_picture: string | null;
    owner_id: number | null;
}

interface Award {
    id: number;
    name: string;
    description: string;
    icon: string;
    color: string;
}

interface TeamAward {
    team_id: number;
    award_id: number;
    meta: string | null;
}

interface PeerVotingScore {
    user_id: number;
    score: string;
    reasoning: string | null;
}

interface SCVote {
    id: number;
    user_id: number;
    vote: string;
    submitted_at: number | null;
>>>>>>> score-release-patch
}

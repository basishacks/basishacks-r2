import {
    sqliteTable,
    integer,
    text,
    uniqueIndex,
    index,
    check,
    primaryKey,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Global hackathon state – a single row (id = 1) that controls the entire
// event lifecycle.
// ---------------------------------------------------------------------------
export const hackathon = sqliteTable(
    "hackathon",
    {
        id: integer("id").primaryKey(),
        status: text("status").notNull(),
        voting_enabled: integer("voting_enabled").notNull().default(0),
        results_published: integer("results_published").notNull().default(0),
        submitted_count: integer("submitted_count").notNull().default(0),
        max_votes_per_user: integer("max_votes_per_user").notNull().default(0),
        judging_open: integer("judging_open").notNull().default(0),
        schedule_start: text("schedule_start"),
        schedule_end: text("schedule_end"),
        start_timestamp: integer("start_timestamp").notNull(),
        end_timestamp: integer("end_timestamp").notNull(),
        voting_start_timestamp: integer("voting_start_timestamp").notNull(),
        voting_end_timestamp: integer("voting_end_timestamp").notNull(),
        results_open_timestamp: integer("results_open_timestamp").notNull(),
        theme_name: text("theme_name"),
        theme_description: text("theme_description"),
    },
    (table) => [
        check("hackathon_id_check", sql`${table.id} = 1`),
        check(
            "hackathon_status_check",
            sql`${table.status} IN ('not_started', 'in_progress', 'voting', 'finished', 'paused')`,
        ),
    ],
);

// ---------------------------------------------------------------------------
// Teams – a group of participants who submit a project together.
// ---------------------------------------------------------------------------
export const teams = sqliteTable(
    "teams",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        name: text("name").notNull(),
        pathway: text("pathway").notNull(),
        score: integer("score"),
        rank: integer("rank"),
        project_name: text("project_name").notNull().default(""),
        project_description: text("project_description").notNull().default(""),
        project_demo_url: text("project_demo_url"),
        project_repo_url: text("project_repo_url"),
        project_submitted: integer("project_submitted").notNull().default(0),
        sourcing: text("sourcing").notNull().default(""),
        season_id: integer("season_id").notNull().default(1),
    },
    (table) => [
        index("teams_score").on(table.score),
        index("teams_rank").on(table.rank),
        index("teams_season").on(table.season_id),
        check("teams_pathway_check", sql`${table.pathway} IN ('junior', 'senior')`),
    ],
);

// ---------------------------------------------------------------------------
// Judge scores per team – each judge assigns structured scores (JSON) to a
// team. One row per (team, judge) pair.
// ---------------------------------------------------------------------------
export const teamScores = sqliteTable(
    "team_scores",
    {
        team_id: integer("team_id").notNull(),
        judge_user_id: integer("judge_user_id").notNull(),
        scores: text("scores").notNull(),
        reasoning: text("reasoning").notNull().default("<no reasoning provided>"),
        season_id: integer("season_id"),
    },
    (table) => [primaryKey({ columns: [table.team_id, table.judge_user_id] })],
);

// ---------------------------------------------------------------------------
// Users – all participants, judges, and admins.
// ---------------------------------------------------------------------------
export const users = sqliteTable(
    "users",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        email: text("email").notNull().unique(),
        role: text("role").notNull().default("participant"),
        name: text("name"),
        team_id: integer("team_id"),
        profile_theme: text("profile_theme"),
        profile_picture: text("profile_picture"),
    },
    (table) => [
        index("idx_users_email").on(table.email),
        uniqueIndex("idx_users_lower_email").on(sql`lower(${table.email})`),
        index("idx_users_team_id").on(table.team_id),
        check("users_role_check", sql`${table.role} IN ('participant', 'judge', 'admin')`),
    ],
);

// ---------------------------------------------------------------------------
// Ballots – a user's peer-voting ballot. Each user can have at most one
// ballot (enforced by the unique index below).
// ---------------------------------------------------------------------------
export const ballots = sqliteTable(
    "ballots",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        user_id: integer("user_id").notNull(),
        reasoning: text("reasoning"),
        submitted: integer("submitted").notNull().default(0),
    },
    (table) => [uniqueIndex("idx_ballots_user_id").on(table.user_id)],
);

// ---------------------------------------------------------------------------
// Individual scores within a ballot – each row assigns a 1–5 score to a
// specific project.
// ---------------------------------------------------------------------------
export const ballotScores = sqliteTable(
    "ballot_scores",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        ballot_id: integer("ballot_id").notNull(),
        project_id: integer("project_id").notNull(),
        score: integer("score"),
    },
    (table) => [
        index("idx_ballot_scores_project_id").on(table.project_id),
        index("idx_ballot_scores_ballot_id").on(table.ballot_id),
        uniqueIndex("idx_unique_ballot_project").on(table.ballot_id, table.project_id),
        check("ballot_scores_score_check", sql`${table.score} IN (NULL, 1, 2, 3, 4, 5)`),
    ],
);

// ---------------------------------------------------------------------------
// OAuth2 applications registered on the platform (first-party and third-party).
// ---------------------------------------------------------------------------
export const oauth2Applications = sqliteTable("oauth2_applications", {
    client_id: text("client_id").notNull().unique().primaryKey(),
    client_secret: text("client_secret").notNull(),
    permissions: text("permissions"),
    redirect_uris: text("redirect_uris"),
    name: text("name").notNull(),
    description: text("description"),
    proxy_microsoft: integer("proxy_microsoft").notNull().default(0),
    type: text("type"),
    profile_picture: text("profile_picture"),
    owner_id: integer("owner_id"),
});

// ---------------------------------------------------------------------------
// Seasons – each hackathon "season" is an independent event cycle.
// ---------------------------------------------------------------------------
export const seasons = sqliteTable(
    "seasons",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        name: text("name").notNull().unique(),
        is_active: integer("is_active").notNull().default(0),
    },
    (table) => [check("seasons_is_active_check", sql`${table.is_active} IN (0, 1)`)],
);

// ---------------------------------------------------------------------------
// Awards assigned to teams (arbitrary key/value metadata per award).
// ---------------------------------------------------------------------------
export const teamAwards = sqliteTable("team_awards", {
    team_id: integer("team_id").notNull(),
    award: text("award").notNull(),
    meta: text("meta").notNull(),
});

// ---------------------------------------------------------------------------
// Peer-voting scores – each user submits one structured peer vote.
// ---------------------------------------------------------------------------
export const peerVotingScores = sqliteTable(
    "peer_voting_scores",
    {
        user_id: integer("user_id").notNull(),
        score: text("score").notNull(),
        reasoning: text("reasoning"),
    },
    (table) => [uniqueIndex("peer_voting_scores_user_id_unique").on(table.user_id)],
);

// ---------------------------------------------------------------------------
// Tracks which teams a user was previously a member of (for history).
// ---------------------------------------------------------------------------
export const userPastTeams = sqliteTable(
    "user_past_teams",
    {
        user_id: integer("user_id").notNull(),
        team_id: integer("team_id").notNull(),
    },
    (table) => [primaryKey({ columns: [table.user_id, table.team_id] })],
);

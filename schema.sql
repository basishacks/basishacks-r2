CREATE TABLE hackathon (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'voting', 'finished', 'paused')),
    start_timestamp INTEGER NOT NULL,
    end_timestamp INTEGER NOT NULL,
    voting_start_timestamp INTEGER NOT NULL,
    voting_end_timestamp INTEGER NOT NULL,
    results_open_timestamp INTEGER NOT NULL,
    theme_name TEXT,
    theme_description TEXT
, "voting_enabled" INTEGER NOT NULL DEFAULT 0, "results_published" INTEGER NOT NULL DEFAULT 0, "submitted_count" INTEGER NOT NULL DEFAULT 0, "max_votes_per_user" INTEGER NOT NULL DEFAULT 0, "judging_open" INTEGER NOT NULL DEFAULT 0, "schedule_start" TEXT, "schedule_end" TEXT);
CREATE TABLE sqlite_sequence(name,seq);
CREATE TABLE _cf_METADATA (
        key INTEGER PRIMARY KEY,
        value BLOB
      );
CREATE TABLE ballots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    reasoning TEXT,
    submitted INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE UNIQUE INDEX idx_ballots_user_id ON ballots (user_id);
CREATE TABLE ballot_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ballot_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    score INTEGER CHECK (score IN (NULL, 1, 2, 3, 4, 5)),
    FOREIGN KEY (ballot_id) REFERENCES ballots(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES teams(id) ON DELETE RESTRICT
);
CREATE INDEX idx_ballot_scores_project_id
    ON ballot_scores (project_id);
CREATE INDEX idx_ballot_scores_ballot_id
    ON ballot_scores (ballot_id);
CREATE UNIQUE INDEX idx_unique_ballot_project
    ON ballot_scores (ballot_id, project_id);
CREATE TABLE IF NOT EXISTS "oauth2_applications" (
	"client_id"	TEXT NOT NULL UNIQUE,
	"client_secret"	TEXT NOT NULL,
	"permissions"	TEXT,
	"redirect_uris"	TEXT,
	"name"	TEXT NOT NULL,
	"description"	TEXT,
	"proxy_microsoft"	INTEGER NOT NULL DEFAULT 0,
	"type"	TEXT,
	"profile_picture"	TEXT,
	"owner_id"	INTEGER,
	PRIMARY KEY("client_id")
);
CREATE TABLE seasons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1))
, "status" TEXT NOT NULL DEFAULT 'not_started', "voting_enabled" INTEGER NOT NULL DEFAULT 0, "results_published" INTEGER NOT NULL DEFAULT 0, "submitted_count" INTEGER NOT NULL DEFAULT 0, "max_votes_per_user" INTEGER NOT NULL DEFAULT 0, "judging_open" INTEGER NOT NULL DEFAULT 0, "schedule_start" TEXT, "schedule_end" TEXT, "start_timestamp" TEXT, "end_timestamp" TEXT, "voting_start_timestamp" TEXT, "voting_end_timestamp" TEXT, "results_open_timestamp" TEXT, "theme_name" INTEGER NOT NULL DEFAULT 0, "theme_description" INTEGER NOT NULL DEFAULT 0);
CREATE UNIQUE INDEX idx_seasons_active ON seasons(is_active) WHERE is_active = 1;
CREATE TABLE IF NOT EXISTS "user_past_teams" (
    "user_id" INTEGER,
    "team_id" INTEGER,
    PRIMARY KEY("user_id", "team_id"),
    FOREIGN KEY("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
    FOREIGN KEY("team_id") REFERENCES "teams"("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "users" (
	"id"	INTEGER,
	"email"	TEXT NOT NULL UNIQUE,
	"name"	TEXT,
	"team_id"	INTEGER,
	"login_code"	TEXT,
	"login_expiry"	INTEGER,
	"role"	TEXT NOT NULL DEFAULT 'participant',
	"profile_theme"	TEXT,
	"profile_picture"	TEXT,
	"age"	INTEGER,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("team_id") REFERENCES "teams"("id")
);
CREATE INDEX idx_users_email ON users (email);
CREATE UNIQUE INDEX idx_users_lower_email ON users (lower(email));
CREATE INDEX idx_users_team_id ON users (team_id);
CREATE TABLE IF NOT EXISTS "teams" (
	"id"	INTEGER,
	"name"	TEXT NOT NULL,
	"project_name"	TEXT NOT NULL DEFAULT '',
	"project_description"	TEXT NOT NULL DEFAULT '',
	"project_demo_url"	TEXT,
	"project_repo_url"	TEXT,
	"project_submitted"	INTEGER NOT NULL DEFAULT 0,
	"pathway"	TEXT CHECK("pathway" IN (NULL, 'junior', 'senior')),
	"score"	INTEGER,
	"rank"	INTEGER,
	"season_id"	INTEGER NOT NULL DEFAULT 0,
	"sourcing"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT)
);
CREATE INDEX teams_rank ON teams (rank);
CREATE INDEX teams_score ON teams (score);
CREATE INDEX teams_season ON teams (season_id);
CREATE TABLE IF NOT EXISTS "judge_scores_migrate" (
	"field1"	TEXT,
	"field2"	TEXT,
	"field3"	TEXT,
	"field4"	TEXT,
	"field5"	TEXT
);
CREATE TABLE IF NOT EXISTS "team_scores" (
	"team_id"	INTEGER NOT NULL,
	"judge_user_id"	INTEGER NOT NULL,
	"scores"	TEXT NOT NULL,
	"reasoning"	TEXT NOT NULL DEFAULT '<no reasoning provided>',
	"season_id"	INTEGER,
	UNIQUE("team_id","judge_user_id")
);

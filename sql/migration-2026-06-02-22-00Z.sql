-- Add FOREIGN KEY constraint to teams.season_id
-- SQLite requires table recreation to add a FK constraint.

PRAGMA foreign_keys = OFF;

CREATE TABLE teams_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    pathway TEXT CHECK (pathway IN (NULL, 'junior', 'senior')),
    score INTEGER,
    rank INTEGER,
    project_name TEXT NOT NULL DEFAULT '',
    project_description TEXT NOT NULL DEFAULT '',
    project_demo_url TEXT,
    project_repo_url TEXT,
    project_submitted INTEGER NOT NULL DEFAULT 0,
    season_id INTEGER NOT NULL,
    FOREIGN KEY (season_id) REFERENCES seasons(id)
);

INSERT INTO teams_new SELECT * FROM teams;

DROP TABLE teams;
ALTER TABLE teams_new RENAME TO teams;

CREATE INDEX IF NOT EXISTS teams_score ON teams (score);
CREATE INDEX IF NOT EXISTS teams_rank ON teams (rank);
CREATE INDEX IF NOT EXISTS teams_season ON teams (season_id);

PRAGMA foreign_keys = ON;

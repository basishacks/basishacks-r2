-- Awards support
-- Creates the awards catalog and the team_awards junction table.

CREATE TABLE IF NOT EXISTS awards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS team_awards (
    team_id INTEGER NOT NULL,
    award_id INTEGER NOT NULL,
    meta TEXT,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (award_id) REFERENCES awards(id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, award_id)
);

CREATE INDEX IF NOT EXISTS idx_team_awards_team_id ON team_awards (team_id);
CREATE INDEX IF NOT EXISTS idx_team_awards_award_id ON team_awards (award_id);

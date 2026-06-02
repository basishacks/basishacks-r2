-- Ensure there's at least one season for existing teams
INSERT INTO seasons (name, is_active)
SELECT 'Default Season', 1
WHERE (SELECT COUNT(*) FROM seasons) = 0;

-- Add season_id to teams (existing rows get assigned to season 1)
ALTER TABLE teams ADD COLUMN season_id INTEGER NOT NULL DEFAULT 1;

-- Create index on season_id
CREATE INDEX IF NOT EXISTS teams_season ON teams (season_id);

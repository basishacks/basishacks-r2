ALTER TABLE teams ADD COLUMN score INTEGER;
ALTER TABLE teams DROP COLUMN rank;
CREATE INDEX teams_score ON teams (score);

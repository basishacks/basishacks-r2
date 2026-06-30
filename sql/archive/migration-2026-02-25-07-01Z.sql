ALTER TABLE teams ADD COLUMN rank INTEGER;
CREATE INDEX teams_rank ON teams (rank);

-- Performance indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_team_scores_judge_user_id ON team_scores(judge_user_id);
CREATE INDEX IF NOT EXISTS idx_user_past_teams_team_id ON user_past_teams(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_season_submitted ON teams(season_id, project_submitted);
CREATE INDEX IF NOT EXISTS idx_oauth2_applications_owner_id ON oauth2_applications(owner_id);

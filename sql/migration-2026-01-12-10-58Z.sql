CREATE TABLE team_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    judge_user_id INTEGER NOT NULL,
    scores TEXT NOT NULL,  -- JSON object of type { [key]: number }
    FOREIGN KEY (team_id) REFERENCES teams(id),
    FOREIGN KEY (judge_user_id) REFERENCES users(id),
    UNIQUE (team_id, judge_user_id)
);

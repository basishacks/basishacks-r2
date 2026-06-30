CREATE TABLE ballots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    projects TEXT NOT NULL,  -- JSON array of integers
    scores TEXT,  -- JSON array of integers (0-5)
    FOREIGN KEY (user_id) REFERENCES users(id)
);
-- users can only have one ballot
CREATE UNIQUE INDEX idx_ballots_user_id ON ballots (user_id);

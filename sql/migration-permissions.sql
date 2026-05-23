-- Drop the role check constraint to allow space-separated permission strings
-- SQLite does not support DROP CONSTRAINT directly; recreate the table instead

PRAGMA foreign_keys = OFF;

CREATE TABLE users_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'participant',
    name TEXT,
    team_id INTEGER,
    login_code TEXT,
    login_expiry INTEGER,
    profile_theme TEXT,
    profile_picture TEXT,
    FOREIGN KEY (team_id) REFERENCES teams(id)
);

INSERT INTO users_new SELECT * FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_lower_email ON users (lower(email));
CREATE INDEX IF NOT EXISTS idx_users_team_id ON users (team_id);

PRAGMA foreign_keys = ON;

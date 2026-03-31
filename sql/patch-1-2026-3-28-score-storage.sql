-- this is intended to be an archive storage of past competitions

CREATE TABLE team_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    pathway TEXT CHECK (pathway IN (NULL, 'junior', 'senior')),
    score INTEGER, -- out of 100
    score_details TEXT, -- JSON string with detailed scoring breakdown alongside with metadata
    rank INTEGER, -- 1-based ranking
    project_name TEXT NOT NULL DEFAULT '',
    project_description TEXT NOT NULL DEFAULT '',
    project_demo_url TEXT,
    project_repo_url TEXT,
    season TEXT NOT NULL -- indicates which season. Should be an ID that can be mapped to a detailed season object stored in another table
);
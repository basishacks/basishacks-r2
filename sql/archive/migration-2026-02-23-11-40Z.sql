PRAGMA defer_foreign_keys = ON;

------------------------------------------------------------
-- 1. Check for invalid project_ids
------------------------------------------------------------
-- These project_ids do NOT exist in teams.id
SELECT DISTINCT project_id
FROM ballot_scores
WHERE project_id NOT IN (SELECT id FROM teams);

-- Optional: fix or delete invalid project_ids before proceeding
-- For example, to delete them:
-- DELETE FROM ballot_scores
-- WHERE project_id NOT IN (SELECT id FROM teams);

------------------------------------------------------------
-- 2. Rename current ballot_scores table
------------------------------------------------------------
ALTER TABLE ballot_scores RENAME TO ballot_scores_old;
DROP INDEX idx_ballot_scores_project_id;
DROP INDEX idx_ballot_scores_ballot_id;
DROP INDEX idx_unique_ballot_project;

------------------------------------------------------------
-- 3. Recreate ballot_scores with foreign key to teams
------------------------------------------------------------
CREATE TABLE ballot_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ballot_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    score INTEGER CHECK (score IN (NULL, 1, 2, 3, 4, 5)),
    FOREIGN KEY (ballot_id) REFERENCES ballots(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES teams(id) ON DELETE RESTRICT
);

CREATE INDEX idx_ballot_scores_project_id
    ON ballot_scores (project_id);

CREATE INDEX idx_ballot_scores_ballot_id
    ON ballot_scores (ballot_id);

CREATE UNIQUE INDEX idx_unique_ballot_project
    ON ballot_scores (ballot_id, project_id);

------------------------------------------------------------
-- 4. Copy existing data
------------------------------------------------------------
INSERT INTO ballot_scores (id, ballot_id, project_id, score)
SELECT id, ballot_id, project_id, score
FROM ballot_scores_old;

------------------------------------------------------------
-- 5. Drop old table
------------------------------------------------------------
DROP TABLE ballot_scores_old;

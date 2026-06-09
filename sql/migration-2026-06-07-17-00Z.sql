CREATE TABLE sc_votes_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    vote TEXT,
    submitted_at INTEGER
);

INSERT INTO sc_votes_new (user_id, vote, submitted_at)
SELECT user_id, vote, submitted_at FROM sc_votes;

DROP TABLE sc_votes;

ALTER TABLE sc_votes_new RENAME TO sc_votes;

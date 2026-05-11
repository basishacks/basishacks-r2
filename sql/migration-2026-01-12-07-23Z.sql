ALTER TABLE users ADD COLUMN role TEXT NOT NULL CHECK (role IN ('participant', 'judge', 'admin')) DEFAULT 'participant';

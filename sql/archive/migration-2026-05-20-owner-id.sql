ALTER TABLE oauth2_applications ADD COLUMN owner_id INTEGER REFERENCES users(id);

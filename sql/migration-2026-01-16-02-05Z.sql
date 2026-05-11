DROP INDEX idx_users_lower_email;
CREATE UNIQUE INDEX idx_users_lower_email ON users (lower(email));

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Database from 'better-sqlite3'
import type { Statement } from 'better-sqlite3'

/**
 * D1-compatible Statement wrapper, mirroring the one in server/utils/database.ts.
 * This lets tests use the same `db.prepare(sql).bind(...).all() / .first() / .run()` API.
 */
class SQLiteStatement {
  private statement: Statement
  private bindings: unknown[] = []

  constructor(statement: Statement) {
    this.statement = statement
  }

  bind(...params: unknown[]): this {
    this.bindings = params
    return this
  }

  first<T = unknown>(): T | undefined {
    return this.statement.get(...this.bindings) as T | undefined
  }

  all<T = unknown>(): { results: T[] } {
    return { results: this.statement.all(...this.bindings) as T[] }
  }

  run(): { meta: { changed_db: number } } {
    const result = this.statement.run(...this.bindings)
    return { meta: { changed_db: result.changes } }
  }
}

/**
 * D1-compatible Database wrapper, mirroring the SQLiteDatabase class in server/utils/database.ts.
 */
export class SQLiteDatabase {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  prepare(sql: string): SQLiteStatement {
    return new SQLiteStatement(this.db.prepare(sql))
  }

  batch<T = unknown>(statements: Array<{ sql: string; params: unknown[] }>): T[] {
    const results: T[] = []
    const transaction = this.db.transaction(() => {
      for (const stmt of statements) {
        const prepared = this.db.prepare(stmt.sql)
        const result = prepared.all(...stmt.params)
        if (Array.isArray(result)) {
          results.push(...(result as T[]))
        } else {
          results.push(result as T)
        }
      }
    })
    transaction()
    return results
  }

  exec(sql: string): void {
    this.db.exec(sql)
  }

  /** Return the underlying better-sqlite3 instance (for Drizzle ORM) */
  getRawDb(): Database.Database {
    return this.db
  }

  /** Return the underlying better-sqlite3 instance (for teardown) */
  close(): void {
    this.db.close()
  }
}

// Path to the schema file relative to the project root
const schemaPath = resolve(import.meta.dirname, '..', 'sql', 'archive', 'init.sql')
const schemaSQL = readFileSync(schemaPath, 'utf-8')

/**
 * Create a fresh in-memory SQLite database with the full schema applied.
 * Use this in tests to get a clean, isolated database instance.
 */
export function createTestDatabase(): SQLiteDatabase {
  const db = new Database(':memory:')
  // Enable foreign keys just like the real app does
  db.pragma('foreign_keys = ON')
  // Run the schema to create all tables and indexes
  db.exec(schemaSQL)

  // Apply migrations that add tables/columns not in init.sql
  db.exec(`
    CREATE TABLE IF NOT EXISTS seasons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_seasons_active ON seasons(is_active) WHERE is_active = 1;

    ALTER TABLE teams ADD COLUMN season_id INTEGER NOT NULL DEFAULT 1;
    CREATE INDEX IF NOT EXISTS teams_season ON teams (season_id);

    CREATE TABLE IF NOT EXISTS user_past_teams (
      user_id INTEGER NOT NULL,
      team_id INTEGER NOT NULL,
      PRIMARY KEY(user_id, team_id),
      FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    ALTER TABLE oauth2_applications ADD COLUMN owner_id INTEGER REFERENCES users(id);

    ALTER TABLE team_scores ADD COLUMN season_id INTEGER;

    CREATE TABLE IF NOT EXISTS peer_voting_scores (
      user_id INTEGER PRIMARY KEY,
      score TEXT NOT NULL,
      reasoning TEXT
    );

    CREATE TABLE IF NOT EXISTS team_awards (
      team_id INTEGER NOT NULL,
      award TEXT NOT NULL,
      meta TEXT NOT NULL DEFAULT '{}',
      PRIMARY KEY(team_id, award),
      FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    ALTER TABLE hackathon ADD COLUMN voting_enabled INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE hackathon ADD COLUMN results_published INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE hackathon ADD COLUMN submitted_count INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE hackathon ADD COLUMN max_votes_per_user INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE hackathon ADD COLUMN judging_open INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE hackathon ADD COLUMN schedule_start TEXT;
    ALTER TABLE hackathon ADD COLUMN schedule_end TEXT;
  `)

  return new SQLiteDatabase(db)
}

/**
 * Reset a test database to a clean state by dropping and re-creating all tables.
 * Faster than closing and re-opening for between-test resets.
 */
export function resetTestDatabase(wrapper: SQLiteDatabase): void {
  wrapper.exec(`
    DELETE FROM sc_votes;
    DELETE FROM ballot_scores;
    DELETE FROM ballots;
    DELETE FROM team_scores;
    DELETE FROM team_awards;
    DELETE FROM peer_voting_scores;
    DELETE FROM user_past_teams;
    DELETE FROM users;
    DELETE FROM oauth2_applications;
    DELETE FROM teams;
    DELETE FROM seasons;
    DELETE FROM hackathon;
  `)
}

// Re-export for convenience in test files
export { Database }
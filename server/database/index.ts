import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './schema'

const DEFAULT_DB_PATH = './database/basishacks.sqlite'

/**
 * Creates and returns a Drizzle ORM instance backed by better-sqlite3.
 * Enables WAL mode and foreign keys on the underlying connection.
 *
 * @param dbPath - Path to the SQLite database file (defaults to './database/basishacks.sqlite')
 */
export function createDrizzleDatabase(dbPath: string = DEFAULT_DB_PATH) {
  const sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  return drizzle(sqlite, { schema })
}

/**
 * Returns a cached Drizzle ORM instance. The first call initializes the
 * database; subsequent calls return the same instance.
 *
 * @param dbPath - Path to the SQLite database file (defaults to './database/basishacks.sqlite')
 */
export function getDb(dbPath: string = DEFAULT_DB_PATH) {
  return createDrizzleDatabase(dbPath)
}
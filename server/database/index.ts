import { drizzle } from 'drizzle-orm/bun-sqlite'
import { createAndMigrateDatabase } from './migrate'
import * as schema from './schema'

const DEFAULT_DB_PATH = './database/basishacks.sqlite'

/**
 * Creates and returns a Drizzle ORM instance backed by bun:sqlite.
 * Applies pending migrations and seeds required data on first use.
 *
 * @param dbPath - Path to the SQLite database file (defaults to './database/basishacks.sqlite')
 */
export function createDrizzleDatabase(dbPath: string = DEFAULT_DB_PATH) {
  const sqlite = createAndMigrateDatabase(dbPath)
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

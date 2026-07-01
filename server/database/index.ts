import type * as schema from './schema'
import { createAndMigrateDatabase } from './migrate'

const DEFAULT_DB_PATH = './database/basishacks.sqlite'

/**
 * Creates and returns a Drizzle ORM instance backed by the runtime's native
 * SQLite driver (`bun:sqlite` under Bun, `better-sqlite3` under Node.js).
 *
 * The driver is selected via dynamic import based on `typeof Bun`, so the
 * opposing driver module is never loaded at runtime. PRAGMAs and migrations
 * are applied before the Drizzle wrapper is returned.
 *
 * @param dbPath - Path to the SQLite database file (defaults to './database/basishacks.sqlite')
 */
export async function createDrizzleDatabase(dbPath: string = DEFAULT_DB_PATH) {
  if (typeof Bun !== 'undefined') {
    const { Database } = await import('bun:sqlite')
    const { drizzle } = await import('drizzle-orm/bun-sqlite')
    const sqlite = new Database(dbPath)
    sqlite.exec('PRAGMA journal_mode = WAL')
    sqlite.exec('PRAGMA foreign_keys = ON')
    createAndMigrateDatabase(sqlite)
    return drizzle(sqlite, { schema })
  } else {
    const Database = (await import('better-sqlite3')).default
    const { drizzle } = await import('drizzle-orm/better-sqlite3')
    const sqlite = new Database(dbPath)
    sqlite.exec('PRAGMA journal_mode = WAL')
    sqlite.exec('PRAGMA foreign_keys = ON')
    createAndMigrateDatabase(sqlite)
    return drizzle(sqlite, { schema })
  }
}

/**
 * Returns a Drizzle ORM instance. The first call initializes the database;
 * subsequent calls return a new instance (callers that need caching should
 * hold onto the returned promise).
 *
 * @param dbPath - Path to the SQLite database file (defaults to './database/basishacks.sqlite')
 */
export async function getDb(dbPath: string = DEFAULT_DB_PATH) {
  return createDrizzleDatabase(dbPath)
}

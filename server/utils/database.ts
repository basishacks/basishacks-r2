import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let dbInstance: Database.Database | null = null

/**
 * Initialize the database globally (call once at startup)
 */
export function initializeDatabase(): Database.Database {
  if (!dbInstance) {
    const dbPath = path.resolve(__dirname, '../../database/basishacks.sqlite')
    console.log(`[DB] Initializing database at: ${dbPath}`)
    dbInstance = new Database(dbPath)
    // Enable foreign keys and WAL mode
    dbInstance.pragma('journal_mode = WAL')
    dbInstance.pragma('foreign_keys = ON')
    console.log('[DB] Database initialized successfully')
  }
  return dbInstance
}

/**
 * Get or initialize the SQLite database instance
 */
export function getDatabase(): Database.Database {
  if (!dbInstance) {
    return initializeDatabase()
  }
  return dbInstance
}

/**
 * SQLite Statement wrapper that mimics D1's Statement interface
 */
class SQLiteStatement {
  private statement: Database.Statement
  private bindings: any[] = []

  constructor(statement: Database.Statement) {
    this.statement = statement
  }

  /**
   * Bind parameters to the statement
   */
  bind(...params: any[]): this {
    this.bindings = params
    return this
  }

  /**
   * Execute the statement and return the first result
   */
  first<T = any>(): T | undefined {
    try {
      const result = this.statement.all(...this.bindings)
      return (result[0] as T) || undefined
    } catch (error) {
      console.error('SQLite error in first():', error)
      throw error
    }
  }

  /**
   * Execute the statement and return all results
   */
  all<T = any>(): { results: T[] } {
    try {
      const results = this.statement.all(...this.bindings) as T[]
      return { results }
    } catch (error) {
      console.error('SQLite error in all():', error)
      throw error
    }
  }

  /**
   * Execute the statement (for INSERT, UPDATE, DELETE)
   */
  run(): { meta: { changed_db: number } } {
    try {
      const result = this.statement.run(...this.bindings)
      return {
        meta: {
          changed_db: result.changes,
        },
      }
    } catch (error) {
      console.error('SQLite error in run():', error)
      throw error
    }
  }
}

/**
 * SQLite Database wrapper that mimics D1Database interface
 */
export class SQLiteDatabase {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  /**
   * Prepare a SQL statement
   */
  prepare(sql: string): SQLiteStatement {
    try {
      const stmt = this.db.prepare(sql)
      return new SQLiteStatement(stmt)
    } catch (error) {
      console.error('SQLite error preparing statement:', error)
      console.error('SQL:', sql)
      throw error
    }
  }

  /**
   * Execute a batch of statements in a transaction
   */
  batch<T = any>(statements: Array<{ sql: string; params: any[] }>): T[] {
    try {
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
    } catch (error) {
      console.error('SQLite error in batch():', error)
      throw error
    }
  }

  /**
   * Exec a raw SQL string (use with caution)
   */
  exec(sql: string): any {
    try {
      return this.db.exec(sql)
    } catch (error) {
      console.error('SQLite error in exec():', error)
      throw error
    }
  }
}

/**
 * Create and return a D1-compatible database wrapper
 */
export function createDatabaseWrapper(): SQLiteDatabase {
  const db = getDatabase()
  return new SQLiteDatabase(db)
}

export default getDatabase

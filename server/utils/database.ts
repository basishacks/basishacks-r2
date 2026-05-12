import { Database, Statement as BunStatement } from 'bun:sqlite'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let dbInstance: Database | null = null

export function updateUserProfileTheme(userId: string, theme: string) {
  const db = createDatabaseWrapper()
  db.prepare('UPDATE users SET theme = ? WHERE id = ?').bind(theme, userId).run()
}
export function getAllTeams(event: any) {
  const db = createDatabaseWrapper();
  const result = db.prepare('SELECT * FROM teams').all();
  return result.results;
}
/**
 * Initialize the database globally (call once at startup)
 */
export function initializeDatabase(): Database {
  if (!dbInstance) {
    const dbPath = path.resolve(__dirname, '../../database/basishacks.sqlite')
    console.log(`[DB] Initializing database at: ${dbPath}`)
    dbInstance = new Database(dbPath, { create: true })
    // Enable foreign keys and WAL mode
    dbInstance.run('PRAGMA journal_mode = WAL')
    dbInstance.run('PRAGMA foreign_keys = ON')
    console.log('[DB] Database initialized successfully')
  }
  return dbInstance
}

/**
 * Get or initialize the SQLite database instance
 */
export function getDatabase(): Database {
  if (!dbInstance) {
    return initializeDatabase()
  }
  return dbInstance
}

/**
 * SQLite Statement wrapper that mimics D1's Statement interface
 */
class SQLiteStatement {
  private statement: BunStatement
  private bindings: any[] = []

  constructor(statement: BunStatement) {
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
      const result = this.statement.get(...this.bindings) as T | undefined
      return result
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
  private db: Database

  constructor(db: Database) {
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
      this.db.run(sql)
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
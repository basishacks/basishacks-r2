import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schema from '../database/schema'

declare module 'h3' {
  interface H3EventContext {
    /** Drizzle ORM instance */
    drizzle: BetterSQLite3Database<typeof schema>
  }
}

export default {}
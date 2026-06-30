import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'
import type * as schema from '../database/schema'

declare module 'h3' {
  interface H3EventContext {
    /** Drizzle ORM instance */
    drizzle: BunSQLiteDatabase<typeof schema>
  }
}

export default {}
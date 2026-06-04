import type { SQLiteDatabase } from '../utils/database'

declare module 'h3' {
  interface H3EventContext {
    cf: CfProperties
    db: SQLiteDatabase
    activeSeason?: Season | null
  }
}

export default {}

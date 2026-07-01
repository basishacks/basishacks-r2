import { createDrizzleDatabase } from '../database'
import { sql } from 'drizzle-orm'

export default defineNitroPlugin(async (nitroApp) => {
  const db = await createDrizzleDatabase()

  const tables = db.all<{ name: string }>(sql`SELECT name FROM sqlite_master WHERE type='table'`)
  console.log(`[Nitro] Database plugin loaded with ${tables.length} tables (Drizzle ORM)`)

  nitroApp.hooks.hook('request', (event) => {
    event.context.drizzle = db
  })
})
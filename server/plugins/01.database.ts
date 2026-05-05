import { initializeDatabase, createDatabaseWrapper } from '../utils/database'

/**
 * Initialize the database when the Nitro server starts
 */
export default defineNitroPlugin((nitroApp) => {
  // Initialize database globally
  const db = initializeDatabase()
  console.log('[Nitro] Database plugin loaded')

  // Attach database wrapper to every H3 event context
  nitroApp.hooks.hook('request', (event) => {
    event.context.db = createDatabaseWrapper()
  })
})

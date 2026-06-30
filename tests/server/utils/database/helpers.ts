import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '~~/server/database/schema'
import { createTestDatabase } from '~~/tests/setup'

function createErrorMock(err: { status?: number; statusCode?: number; message?: string; statusMessage?: string }) {
  const statusCode = err.statusCode ?? err.status ?? 500
  const message = err.statusMessage ?? err.message ?? 'Error'
  const error = new Error(message) as any
  error.statusCode = statusCode
  error.statusMessage = message
  throw error
}

export function createMockEvent() {
  const db = createTestDatabase()
  const drizzleDb = drizzle(db.getRawDb(), { schema })

  // Stub Nitro auto-imports used by database helpers
  vi.stubGlobal('createError', createErrorMock)
  vi.stubGlobal('getActiveSeason', async () => {
    const row = drizzleDb
      .select()
      .from(schema.seasons)
      .where(eq(schema.seasons.is_active, 1))
      .get()
    return row ?? null
  })
  vi.stubGlobal('getHackathon', async () => {
    const row = drizzleDb
      .select()
      .from(schema.hackathon)
      .get()
    return row ?? null
  })

  return {
    context: { db, drizzle: drizzleDb },
  } as any
}
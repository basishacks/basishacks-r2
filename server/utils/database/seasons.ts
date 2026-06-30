import type { H3Event } from 'h3'
import { eq, asc } from 'drizzle-orm'
import { seasons } from '~~/server/database/schema'

export async function getSeasons(event: H3Event): Promise<Season[]> {
  return event.context.drizzle
    .select()
    .from(seasons)
    .orderBy(asc(seasons.id))
    .all()
}

export async function getSeasonById(event: H3Event, seasonId: number): Promise<Season | null> {
  const row = event.context.drizzle
    .select()
    .from(seasons)
    .where(eq(seasons.id, seasonId))
    .get()

  return row ?? null
}

export async function getActiveSeason(event: H3Event): Promise<Season | null> {
  const row = event.context.drizzle
    .select()
    .from(seasons)
    .where(eq(seasons.is_active, 1))
    .get()

  return row ?? null
}

export async function setActiveSeason(event: H3Event, seasonId: number | null) {
  event.context.drizzle
    .update(seasons)
    .set({ is_active: 0 })
    .run()

  if (seasonId !== null) {
    const result = event.context.drizzle
      .update(seasons)
      .set({ is_active: 1 })
      .where(eq(seasons.id, seasonId))
      .run()

    if (result.changes === 0) {
      throw createError({
        status: 404,
        message: 'Season not found',
      })
    }
  }
}
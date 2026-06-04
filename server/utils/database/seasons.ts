import type { H3Event } from 'h3'

export async function getSeasons(event: H3Event): Promise<Season[]> {
  const result = event.context.db
    .prepare('SELECT * FROM seasons ORDER BY id ASC')
    .all() as { results: Season[] }
  return result.results
}

export async function getSeasonById(event: H3Event, seasonId: number): Promise<Season | null> {
  return event.context.db
    .prepare('SELECT * FROM seasons WHERE id = ?')
    .bind(seasonId)
    .first() as Season | null
}

export async function getActiveSeason(event: H3Event): Promise<Season | null> {
  if ('activeSeason' in event.context) {
    return event.context.activeSeason!
  }
  const result = event.context.db
    .prepare('SELECT * FROM seasons WHERE is_active = 1')
    .first() as Season | null
  event.context.activeSeason = result
  return result
}

export async function setActiveSeason(event: H3Event, seasonId: number | null) {
  event.context.db.prepare('UPDATE seasons SET is_active = 0').run()

  if (seasonId !== null) {
    const result = event.context.db
      .prepare('UPDATE seasons SET is_active = 1 WHERE id = ?')
      .bind(seasonId)
      .run()

    if (!result.meta.changed_db) {
      throw createError({
        status: 404,
        message: 'Season not found',
      })
    }
  }
}

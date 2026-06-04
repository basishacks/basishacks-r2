import { getActiveSeason } from '~~/server/utils/database/seasons'
import { requireUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const results = await event.context.db.prepare(
    `SELECT
      s.id AS season_id,
      s.name AS season_name,
      COUNT(DISTINCT t.id) AS project_count,
      COUNT(DISTINCT CASE WHEN t.project_submitted = 1 THEN t.id END) AS submitted_count,
      COUNT(DISTINCT ts.team_id) AS ballot_count
    FROM seasons s
    LEFT JOIN teams t ON t.season_id = s.id
    LEFT JOIN team_scores ts ON ts.team_id = t.id AND ts.judge_user_id = ?
    GROUP BY s.id
    ORDER BY s.id ASC`,
  ).bind(user.id).all() as { results: BallotSummaryItem[] }

  const activeSeason = await getActiveSeason(event)
  const activeSeasonId = activeSeason?.id ?? null

  let current: BallotSummaryItem | null = null
  const past: BallotSummaryItem[] = []

  for (const item of results.results) {
    if (item.season_id === activeSeasonId) {
      current = item
    } else {
      past.push(item)
    }
  }

  return { current, past } satisfies GetBallotSummaryResponse
})

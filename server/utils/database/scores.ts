import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { teamScores } from '~~/server/database/schema'

export async function createTeamScores(
  event: H3Event,
  scores: Pick<
    TeamScores,
    'team_id' | 'judge_user_id' | 'scores' | 'reasoning'
  >,
): Promise<TeamScores> {

  const season = await getHackathon(event)

  return event.context.drizzle
    .insert(teamScores)
    .values({
      team_id: scores.team_id,
      judge_user_id: scores.judge_user_id,
      reasoning: scores.reasoning,
      scores: scores.scores,
      season_id: season?.id,
    })
    .returning()
    .get()!
}

export async function getTeamScoresByTeamID(event: H3Event, teamID: number): Promise<TeamScores[]> {
  return event.context.drizzle
    .select()
    .from(teamScores)
    .where(eq(teamScores.team_id, teamID))
    .all()
}
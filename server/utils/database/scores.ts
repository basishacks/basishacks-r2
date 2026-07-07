import type { H3Event } from 'h3'

export async function createTeamScores(
  event: H3Event,
  scores: Pick<
    TeamScores,
    'team_id' | 'judge_user_id' | 'scores' | 'reasoning'
  >,
): Promise<TeamScores> {

  const season = await getHackathon(event)

  return (event.context.db.prepare(
    'INSERT INTO team_scores(team_id, judge_user_id, reasoning, scores, season_id) VALUES(?, ?, ?, ?, ?) RETURNING *',
  )
    .bind(scores.team_id, scores.judge_user_id, scores.reasoning, scores.scores, season?.id)
    .first() as TeamScores)!
}

export async function getTeamScoresByTeamID(event: H3Event, teamID: number): Promise<TeamScores[]> {
  return (
    event.context.db.prepare(
      'SELECT * FROM team_scores WHERE team_id = ?',
    )
      .bind(teamID)
      .all() as { results: TeamScores[] }
  ).results
}

export async function getTeamScoresBySeasonId(event: H3Event, seasonID: number): Promise<TeamScores[]> {

  return (
    event.context.db.prepare(
      'SELECT * FROM team_scores WHERE season_id = ?',
    )
    .bind(seasonID)
    .all() as { results: TeamScores[] }
  ).results

}

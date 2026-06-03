import type { H3Event } from 'h3'

// --- Active season filtered (default behavior) ---

export async function getTeam(event: H3Event, teamID: number): Promise<Team | null> {
  const activeSeason = await getActiveSeason(event)
  const seasonId = activeSeason?.id ?? -1
  return event.context.db.prepare(
    'SELECT * FROM teams WHERE id = ? AND season_id = ?',
  )
    .bind(teamID, seasonId)
    .first() as Team | null
}

export async function getAllTeams(event: H3Event): Promise<Team[]> {
  const activeSeason = await getActiveSeason(event)
  const seasonId = activeSeason?.id ?? -1
  return (
    event.context.db.prepare(
      'SELECT * FROM teams WHERE season_id = ?',
    )
      .bind(seasonId)
      .all() as { results: Team[] }
  ).results
}

export async function getSubmittedUnjudgedTeams(
  event: H3Event,
  judgeUserID: number,
): Promise<Team[]> {
  const activeSeason = await getActiveSeason(event)
  const seasonId = activeSeason?.id ?? -1
  return (
    event.context.db.prepare(
      'SELECT * FROM teams t WHERE season_id = ? AND project_submitted = 1 AND NOT EXISTS (SELECT 1 FROM team_scores ts WHERE ts.team_id = t.id AND ts.judge_user_id = ?)',
    )
      .bind(seasonId, judgeUserID)
      .all() as { results: Team[] }
  ).results
}

export async function getSubmittedTeams(event: H3Event): Promise<Team[]> {
  const activeSeason = await getActiveSeason(event)
  const seasonId = activeSeason?.id ?? -1
  return (
    event.context.db.prepare(
      'SELECT * FROM teams WHERE season_id = ? AND project_submitted = 1',
    )
      .bind(seasonId)
      .all() as { results: Team[] }
  ).results
}

// --- Unrestricted / by season ---

export async function getTeamById(event: H3Event, teamID: number): Promise<Team | null> {
  return event.context.db.prepare(
    'SELECT * FROM teams WHERE id = ?',
  )
    .bind(teamID)
    .first() as Team | null
}

export async function getTeamBySeason(event: H3Event, teamID: number, seasonId: number): Promise<Team | null> {
  return event.context.db.prepare(
    'SELECT * FROM teams WHERE id = ? AND season_id = ?',
  )
    .bind(teamID, seasonId)
    .first() as Team | null
}

export async function getAllTeamsAllSeasons(event: H3Event): Promise<Team[]> {
  return (
    event.context.db.prepare(
      'SELECT * FROM teams',
    ).all() as { results: Team[] }
  ).results
}

export async function getTeamsBySeason(event: H3Event, seasonId: number): Promise<Team[]> {
  return (
    event.context.db.prepare(
      'SELECT * FROM teams WHERE season_id = ?',
    )
      .bind(seasonId)
      .all() as { results: Team[] }
  ).results
}

// --- Mutations ---

export async function createTeam(event: H3Event, teamName: string): Promise<Team> {
  const activeSeason = await getActiveSeason(event)
  const seasonId = activeSeason?.id
  if (!seasonId) {
    throw createError({
      status: 403,
      message: 'No active season',
    })
  }

  const team = (event.context.db.prepare(
    'INSERT INTO teams(name, season_id) VALUES(?, ?) RETURNING *',
  )
    .bind(teamName, seasonId)
    .first() as Team)!
  return team
}

export async function updateTeam(event: H3Event, team: Team) {
  const result = event.context.db.prepare(
    'UPDATE teams SET name = ?, pathway = ?, score = ?, rank = ?, project_name = ?, project_description = ?, project_demo_url = ?, project_repo_url = ?, project_submitted = ?, sourcing = ?, season_id = ? WHERE id = ?',
  )
    .bind(
      team.name,
      team.pathway,
      team.score,
      team.rank,
      team.project_name,
      team.project_description,
      team.project_demo_url,
      team.project_repo_url,
      team.project_submitted,
      team.sourcing,
      team.season_id,
      team.id,
    )
    .run()
  if (!result.meta.changed_db) {
    throw createError({
      status: 404,
      message: 'Team not found',
    })
  }
}

export async function deleteTeams(event: H3Event, teamIDs: number[]) {
  for (const id of teamIDs) {
    event.context.db.prepare(
      'DELETE FROM ballot_scores WHERE project_id = ?'
    ).bind(id).run()

    event.context.db.prepare(
      'DELETE FROM team_scores WHERE team_id = ?'
    ).bind(id).run()

    event.context.db.prepare(
      'UPDATE users SET team_id = NULL WHERE team_id = ?'
    ).bind(id).run()

    event.context.db.prepare(
      'DELETE FROM teams WHERE id = ?'
    ).bind(id).run()
  }
}

import type { H3Event } from 'h3'

export async function getTeamMembers(event: H3Event, teamID: number): Promise<User[]> {
  const result = event.context.db.prepare(
    'SELECT * FROM users WHERE team_id = ?'
  )
    .bind(teamID)
    .all() as { results: User[] }
  return result.results
}

export async function getAllTeamMembers(event: H3Event, teamID: number): Promise<User[]> {
  const result = event.context.db.prepare(
    `SELECT DISTINCT u.* FROM users u
     LEFT JOIN user_past_teams upt ON u.id = upt.user_id
     WHERE u.team_id = ? OR upt.team_id = ?
     ORDER BY u.id ASC`
  )
    .bind(teamID, teamID)
    .all() as { results: User[] }
  return result.results
}

export async function getUserPastTeams(event: H3Event, userID: number): Promise<Team[]> {
  const result = event.context.db.prepare(
    `SELECT t.* FROM teams t
     INNER JOIN user_past_teams upt ON t.id = upt.team_id
     WHERE upt.user_id = ?
     ORDER BY t.id ASC`
  )
    .bind(userID)
    .all() as { results: Team[] }
  return result.results
}

export async function addUserPastTeam(
  event: H3Event,
  userID: number,
  teamID: number
) {
  event.context.db.prepare(
    'INSERT OR IGNORE INTO user_past_teams(user_id, team_id) VALUES(?, ?)'
  )
    .bind(userID, teamID)
    .run()
}

export async function removeTeamMember(
  event: H3Event,
  teamID: number,
  userID: number
) {
  // Record the team as past before removing
  await addUserPastTeam(event, userID, teamID)

  const result = event.context.db.prepare(
    'UPDATE users SET team_id = NULL WHERE id = ? AND team_id = ?'
  )
    .bind(userID, teamID)
    .run()

  if (!result.meta.changed_db) {
    throw createError({
      status: 404,
      message: 'User not found or not in team',
    })
  }
}

export async function addTeamMember(
  event: H3Event,
  teamID: number,
  userID: number
) {
  const result = event.context.db.prepare(
    'UPDATE users SET team_id = ? WHERE id = ? AND team_id IS NULL'
  )
    .bind(teamID, userID)
    .run()

  if (!result.meta.changed_db) {
    throw createError({
      status: 404,
      message: 'User not found or already in a team',
    })
  }
}

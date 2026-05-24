import type { H3Event } from 'h3';

export async function getTeamMembers(event: H3Event, teamID: number): Promise<User[]> {
  const result = event.context.db
    .prepare('SELECT * FROM users WHERE team_id = ?')
    .bind(teamID)
    .all() as { results: User[] };
  return result.results;
}

export async function removeTeamMember(event: H3Event, teamID: number, userID: number) {
  const result = event.context.db
    .prepare('UPDATE users SET team_id = NULL WHERE id = ? AND team_id = ?')
    .bind(userID, teamID)
    .run();

  if (!result.meta.changed_db) {
    throw createError({
      status: 404,
      message: 'User not found or not in team',
    });
  }
}

export async function addTeamMember(event: H3Event, teamID: number, userID: number) {
  const result = event.context.db
    .prepare('UPDATE users SET team_id = ? WHERE id = ? AND team_id IS NULL')
    .bind(teamID, userID)
    .run();

  if (!result.meta.changed_db) {
    throw createError({
      status: 404,
      message: 'User not found or already in a team',
    });
  }
}

import { DevPermissions } from '~~/shared/permissions'
import { users, userPastTeams } from '~~/server/database/schema'
import { eq, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requirePermission(event, DevPermissions.PORTAL_USERS_VIEW)

  const results = event.context.drizzle
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      name: users.name,
      team_id: users.team_id,
      login_code: users.login_code,
      login_expiry: users.login_expiry,
      profile_theme: users.profile_theme,
      profile_picture: users.profile_picture,
      past_team_ids: sql<string | null>`GROUP_CONCAT(${userPastTeams.team_id})`,
    })
    .from(users)
    .leftJoin(userPastTeams, eq(users.id, userPastTeams.user_id))
    .groupBy(users.id)
    .orderBy(users.id)
    .all()

  return results
})
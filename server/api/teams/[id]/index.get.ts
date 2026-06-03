import { DevPermissions, hasPermission } from "~~/shared/permissions"

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = parseInt(getRouterParam(event, 'id')!)
  const isMember = user.team_id === id

  const team = await getTeam(event, id, true)

  if (!team) {
    return createError({
      status: 404,
      message: "Team '" + id + "' does not exist"
    })
  }

  // Team members and dev-portal users see scores; everyone else gets public view
  const showDetails = isMember || hasPermission(user.role, DevPermissions.PORTAL_TEAMS_VIEW)

  return convertTeamToPublic(team, showDetails)
})

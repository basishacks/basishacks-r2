import { DevPermissions, hasPermission } from "~~/shared/permissions"

export default defineEventHandler(async (event) => {

  const user = await requireUser(event)
  let details = false;

  if (user) {
    if (hasPermission(user.role, DevPermissions.PORTAL_TEAMS_VIEW)) {
      details = true
    }
  }


  const id = parseInt(getRouterParam(event, 'id')!)

  const team = await getTeam(event, id)

  if (!team) {
    return createError({
      status: 404,
      message: "Team '" + id + "' does not exist"
    })
  }

  return convertTeamToPublic(team, details)
})

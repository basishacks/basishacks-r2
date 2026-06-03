import { DevPermissions } from "~~/shared/permissions"

export default defineEventHandler(async (event) => {

  //await requirePermission(event, DevPermissions.PORTAL_TEAMS_VIEW)
  // u technically dont need this anymore ... since u can just GET /api/teams/1 without any perms

  const query = getQuery(event)

  if (query.judging) {
    const { id: userID } = await requireJudge(event)

    const teams = await getSubmittedUnjudgedTeams(event, userID)

    return teams.map((t) => convertTeamToPublic(t))
  } else {
    const teams = await getAllTeams(event)

    return teams.map((t) => convertTeamToPublic(t))
  }
})

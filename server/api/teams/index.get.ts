import { DevPermissions } from "~~/shared/permissions"

export default defineEventHandler(async (event) => {

  //await requirePermission(event, DevPermissions.PORTAL_TEAMS_VIEW)
  // u technically dont need this anymore ... since u can just GET /api/teams/1 without any perms

  const query = getQuery(event)

  if (query.judging) {
    const { id: userID } = await requireJudge(event)

    const teams = await getSubmittedUnjudgedTeams(event, userID)
    const awardsByTeam = await getAwardsForTeams(
      event,
      teams.map((t) => t.id),
    )

    return teams.map((t) => convertTeamToPublic(t, false, awardsByTeam[t.id] ?? []))
  } else {
    const seasonId = query.season_id ? Number(query.season_id) : -1
    const teams = seasonId === -1
      ? await getAllTeams(event)
      : await getTeamsBySeason(event, seasonId)
    const awardsByTeam = await getAwardsForTeams(
      event,
      teams.map((t) => t.id),
    )

    return teams.map((t) => convertTeamToPublic(t, false, awardsByTeam[t.id] ?? []))
  }
})

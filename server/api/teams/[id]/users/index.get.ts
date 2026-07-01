import { getTeamById } from '~~/server/utils/database/teams'
import { getActiveSeason } from '~~/server/utils/database/seasons'
import { getAllTeamMembers, getTeamMembers } from '~~/server/utils/database/members'

export default defineEventHandler(async (event) => {
  await requireUser(event)

  const teamID = parseInt(getRouterParam(event, 'id')!)

  const team = await getTeamById(event, teamID)
  const activeSeason = await getActiveSeason(event)
  const isOldTeam = !team || (activeSeason && team.season_id !== activeSeason.id)

  const members = isOldTeam
    ? await getAllTeamMembers(event, teamID)
    : await getTeamMembers(event, teamID)

  return members.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    team_id: user.team_id,
  })) satisfies GetTeamMembersResponse
})

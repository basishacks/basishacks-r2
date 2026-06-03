import { getTeamById } from '~~/server/utils/database/teams'
import { getActiveSeason } from '~~/server/utils/database/seasons'
import { getAllTeamMembers } from '~~/server/utils/database/members'

export default defineEventHandler(async (event) => {
  const teamID = parseInt(getRouterParam(event, 'id')!)

  const team = await getTeamById(event, teamID)
  const activeSeason = await getActiveSeason(event)
  const isOldTeam = !team || (activeSeason && team.season_id !== activeSeason.id)

  const users = isOldTeam
    ? await getAllTeamMembers(event, teamID)
    : await getTeamMembers(event, teamID)

  return users.map(convertUserToPublic) satisfies GetTeamMembersResponse
})

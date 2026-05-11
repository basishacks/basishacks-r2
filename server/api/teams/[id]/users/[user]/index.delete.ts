export default defineEventHandler(async (event) => {
  const teamID = parseInt(getRouterParam(event, 'id')!)
  const userID = parseInt(getRouterParam(event, 'user')!)

  const {
    user: { id: currentUserID },
  } = await requireUserSession(event)

  const currentUser = await getUser(event, currentUserID)
  if (currentUser?.team_id !== teamID) {
    throw createError({
      status: 403,
      message: 'Cannot remove members of other teams',
    })
  }

  const hackathon = await getHackathon(event)
  if (
    hackathon?.status !== 'not_started' &&
    hackathon?.status !== 'in_progress'
  ) {
    throw createError({
      status: 403,
      message: 'Cannot remove members after hackathon has finished',
    })
  }

  const team = (await getTeam(event, teamID))!
  if (team.project_submitted) {
    throw createError({
      status: 403,
      message: 'Cannot remove members after project is submitted',
    })
  }

  await removeTeamMember(event, teamID, userID)

  return { message: 'Removed user from the team' }
})

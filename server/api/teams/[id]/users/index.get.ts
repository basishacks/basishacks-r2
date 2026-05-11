export default defineEventHandler(async (event) => {
  const teamID = parseInt(getRouterParam(event, 'id')!)

  const users = await getTeamMembers(event, teamID)

  return users.map(convertUserToPublic) satisfies GetTeamMembersResponse
})

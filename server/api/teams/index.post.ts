import { CreateTeamQuery, CreateTeamRequest } from '~~/shared/schemas'

export default defineEventHandler(async (event) => {
  const {
    user: { id: userID },
  } = await requireUserSession(event)

  const user = await getUser(event, userID)
  if (!user) {
    throw createError({
      status: 401,
      message: 'Logged in user not found',
    })
  }
  if (user?.team_id) {
    throw createError({
      status: 403,
      message: 'Cannot create a team while in a team',
    })
  }

  const hackathon = await getHackathon(event)
  if (
    hackathon?.status !== 'not_started' &&
    hackathon?.status !== 'in_progress'
  ) {
    throw createError({
      status: 403,
      message: 'Cannot create team after hackathon has finished',
    })
  }

  const { add = false } = await getValidatedQuery(event, CreateTeamQuery.parse)
  const { name } = await readValidatedBody(event, CreateTeamRequest.parse)

  const team = await createTeam(event, name)
  if (add) {
    await addTeamMember(event, team.id, userID)
  }

  return convertTeamToPublic(team)
})

import { CreateTeamScoresRequest } from '~~/shared/schemas'

export default defineEventHandler(async (event) => {
  const teamID = parseInt(getRouterParam(event, 'id')!)

  const { id: userID } = await requireJudge(event)

  const payload = await readValidatedBody(event, CreateTeamScoresRequest.parse)

  try {
    await createTeamScores(event, {
      team_id: teamID,
      judge_user_id: userID,
      scores: JSON.stringify(payload.scores),
      reasoning: payload.reasoning,
    })
  } catch {
    throw createError({
      status: 409,
      message: 'You already scored this project',
    })
  }

  return { message: 'Successfully scored project' }
})

import { SubmitVoteRequest } from '~~/shared/schemas'

export default defineEventHandler(async (event) => {
  const hackathon = await getHackathon(event)
  if (hackathon?.status !== 'voting') {
    throw createError({
      status: 409,
      message: 'Peer voting is closed',
    })
  }

  const user = await requireUser(event)
  if (!user.team_id) {
    throw createError({
      status: 403,
      message: 'Only participants can vote',
    })
  }

  const userTeam = await getTeam(event, user.team_id)
  if (!userTeam?.project_submitted) {
    throw createError({
      status: 403,
      message: 'Only participants with submitted projects can vote',
    })
  }

  const existingVote = await getPeerVoteByUser(event, user.id)
  if (existingVote) {
    throw createError({
      status: 403,
      message: 'You have already submitted your vote',
    })
  }

  const payload = await readValidatedBody(event, SubmitVoteRequest.parse)

  const projects = await getSubmittedTeams(event)
  const eligibleProjects = projects.filter(
    (p) => p.id !== user.team_id && p.pathway === userTeam.pathway,
  )

  if (payload.scores.length !== eligibleProjects.length) {
    throw createError({
      status: 403,
      message: `Incorrect number of scores submitted. Expected ${eligibleProjects.length}, got ${payload.scores.length}`,
    })
  }

  const scoreObj: Record<string, number> = {}
  for (let i = 0; i < eligibleProjects.length; i++) {
    scoreObj[eligibleProjects[i].id] = payload.scores[i]!
  }

  await createPeerVote(
    event,
    user.id,
    JSON.stringify(scoreObj),
    payload.reasoning,
  )

  return { message: 'Successfully submitted vote!' }
})

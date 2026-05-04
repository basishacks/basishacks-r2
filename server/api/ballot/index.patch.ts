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

  const ballot = await getBallotByUser(event, user.id)
  if (!ballot) {
    throw createError({
      status: 409,
      message: 'No ballot found',
    })
  }

  if (ballot.submitted) {
    throw createError({
      status: 403,
      message: 'Cannot edit vote after submission',
    })
  }

  const payload = await readValidatedBody(event, SubmitVoteRequest.parse)

  const ballotScores = await getBallotScores(event, ballot.id)
  if (ballotScores.length !== payload.scores.length) {
    throw createError({
      status: 403,
      message: 'Incorrect number of scores submitted',
    })
  }

  for (let i = 0; i < ballotScores.length; i++) {
    ballotScores[i].score = payload.scores[i]!
    await updateBallotScore(event, ballotScores[i])
  }

  ballot.reasoning = payload.reasoning
  ballot.submitted = 1
  await updateBallot(event, ballot)

  return { message: 'Successfully submitted vote!' }
})

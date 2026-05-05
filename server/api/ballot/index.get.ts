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

  let ballot = await getBallotByUser(event, user.id)
  let ballotScores: (BallotScore & { team: Team })[] = []
  if (!ballot) {
    // create one
    const projects = await getSubmittedTeams(event)
    const eligibleProjects = projects.filter(
      (p) => p.id !== user.team_id && p.pathway === userTeam.pathway,
    )

    if (eligibleProjects.length < 4) {
      throw createError({
        status: 409,
        message: `Not enough projects (${eligibleProjects.length}) to vote on`,
      })
    }

    const ballotProjects: Team[] = []

    for (let i = 0; i < 4; i++) {
      const index = Math.floor(Math.random() * eligibleProjects.length)
      const project = eligibleProjects.splice(index, 1)[0]
      ballotProjects.push(project)
    }

    ballot = await createBallot(event, user.id)
    for (const team of ballotProjects) {
      const score = await createBallotScore(event, ballot.id, team.id)
      ballotScores.push({ ...score, team: team })
    }
  } else {
    const scores = await getBallotScores(event, ballot.id)
    ballotScores = await Promise.all(
      scores.map(async (s) => ({
        ...s,
        team: (await getTeam(event, s.project_id))!,
      })),
    )
  }

  return {
    id: ballot.id,
    projects: ballotScores.map((s) => ({
      ...convertTeamToPublic(s.team).project,
      id: s.project_id,
    })),
    scores:
      ballotScores[0]!.score === null
        ? null
        : ballotScores.map((s) => s.score!),
    reasoning: ballot.reasoning,
  } satisfies GetBallotResponse
})

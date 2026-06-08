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

  const projects = await getSubmittedTeams(event)
  const eligibleProjects = projects.filter(
    (p) => p.id !== user.team_id && p.pathway === userTeam.pathway,
  )

  const peerVote = await getPeerVoteByUser(event, user.id)

  let scores: number[] = eligibleProjects.map(() => 0)
  let reasoning: string | null = null
  let submitted = false

  if (peerVote) {
    submitted = true
    reasoning = peerVote.reasoning
    try {
      const scoreObj = JSON.parse(peerVote.score) as Record<string, number>
      scores = eligibleProjects.map((p) => scoreObj[p.id] ?? 0)
    } catch {
      scores = eligibleProjects.map(() => 0)
    }
  }

  return {
    submitted,
    projects: eligibleProjects.map((t) => convertTeamToPublic(t)),
    scores,
    reasoning,
  } satisfies GetBallotResponse
})

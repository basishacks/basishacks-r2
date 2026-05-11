import rubrics from '~~/shared/rubric'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const query = getQuery(event)
  const shouldUpdate = !!query.update

  const teams = (await getAllTeams(event)).filter((t) => t.project_submitted)

  const pathways = ['junior', 'senior'] as const
  for (const pathway of pathways) {
    const projects = teams.filter((t) => t.pathway === pathway)

    // calculate scores
    for (const project of projects) {
      // peer voting = 25%
      const ballotScores = await getBallotScoresByTeamID(event, project.id)
      let ballotCount = 0,
        ballotTotal = 0
      for (const ballot of ballotScores) {
        if (ballot.score) {
          ballotCount++
          ballotTotal += ballot.score
        }
      }
      const peerScore = (5 * ballotTotal) / ballotCount

      // judges = 75%
      const judgeScores = await getTeamScoresByTeamID(event, project.id)
      let judgeTotal = 0
      for (const score of judgeScores) {
        const scores = JSON.parse(score.scores)
        for (const [category, { weight }] of Object.entries(rubrics[pathway])) {
          judgeTotal += (scores[category] * weight) / 5
        }
      }
      const judgeScore = (judgeTotal / judgeScores.length) * 0.75

      const totalScore = Math.round((peerScore + judgeScore) * 10)
      project.score = totalScore
    }

    projects.sort((a, b) => b.score! - a.score!)

    // calculate ranks
    let rank = 0,
      rankIncrement = 1,
      lastScore = 1e9

    for (const project of projects) {
      if (project.score! < lastScore) {
        rank += rankIncrement
        rankIncrement = 0
        lastScore = project.score!
      }
      rankIncrement++
      project.rank = rank
    }
  }

  if (shouldUpdate) {
    console.log('update!')
    await Promise.all(teams.map((t) => updateTeam(event, t)))
  }

  return teams
    .toSorted(
      (a, b) => a.pathway!.localeCompare(b.pathway!) || a.rank! - b.rank!,
    )
    .map((t) => convertTeamToPublic(t, true))
})

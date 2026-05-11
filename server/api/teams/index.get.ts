import { getAllTeams } from '~~/server/utils/database/teams'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  if (query.judging) {
    const { id: userID } = await requireJudge(event)

    const teams = await getSubmittedUnjudgedTeams(event, userID)

    return teams.map((t) => convertTeamToPublic(t))
  } else {
    const teams = await getAllTeams(event)

    return teams.map((t) => convertTeamToPublic(t))
  }
})

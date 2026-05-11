export default defineEventHandler(async (event) => {
  const hackathon = await getHackathon(event)

  if (!hackathon) {
    throw createError({
      statusCode: 404,
      message: 'No hackathon found',
    })
  }

  const showTheme =
    hackathon.status !== 'not_started' && hackathon.status !== 'paused'

  return {
    status: hackathon.status,
    start_timestamp: hackathon.start_timestamp,
    end_timestamp: hackathon.end_timestamp,
    voting_start_timestamp: hackathon.voting_start_timestamp,
    voting_end_timestamp: hackathon.voting_end_timestamp,
    results_open_timestamp: hackathon.results_open_timestamp,
    theme_name: showTheme ? hackathon.theme_name : null,
    theme_description: showTheme ? hackathon.theme_description : null,
  }
})

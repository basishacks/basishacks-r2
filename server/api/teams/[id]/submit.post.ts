import { SubmitTeamRequest } from '~~/shared/schemas'

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id')!)

  const {
    user: { id: userID },
  } = await requireUserSession(event)

  const user = await getUser(event, userID)
  if (user?.team_id !== id) {
    throw createError({
      status: 403,
      message: 'Cannot submit other projects',
    })
  }

  const hackathon = await getHackathon(event)
  if (hackathon?.status !== 'in_progress') {
    throw createError({
      status: 403,
      message: 'Cannot submit project when hackathon is finished',
    })
  }

  const payload = await readValidatedBody(event, SubmitTeamRequest.parse)

  const team = (await getTeam(event, id))!
  if (team.project_submitted) {
    throw createError({
      status: 403,
      message: 'Project is already submitted',
    })
  }

  team.pathway = payload.pathway
  team.project_name = payload.project.name
  team.project_description = payload.project.description
  team.project_demo_url = payload.project.demo_url
  team.project_repo_url = payload.project.repo_url
  team.project_submitted = 1

  await updateTeam(event, team)

  return { message: 'Successfully submitted project' }
})

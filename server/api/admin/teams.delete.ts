import { z } from 'zod'
import { DevPermissions } from '~~/shared/permissions'

const DeleteTeamsRequest = z.object({
  ids: z.array(z.number().int().positive())
})

export default defineEventHandler(applyRateLimit(async (event) => {
  await requirePermission(event, DevPermissions.TEAMS)

  const body = await readValidatedBody(event, DeleteTeamsRequest.parse)
  await deleteTeams(event, body.ids)

  return { message: `Deleted ${body.ids.length} team(s)` }
}))

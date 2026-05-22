import { z } from 'zod'
import { DevPermissions } from '~~/shared/permissions'

const DeleteApplicationsRequest = z.object({
  ids: z.array(z.string().min(1))
})

export default defineEventHandler(applyRateLimit(async (event) => {
  // const canDeleteAll = await requirePermission(event, DevPermissions.PORTAL_APPLICATIONS_DELETE)
  const body = await readValidatedBody(event, DeleteApplicationsRequest.parse)

  
  await deleteOAuth2Applications(event, body.ids)

  return { message: `Deleted ${body.ids.length} application(s)` }
}))

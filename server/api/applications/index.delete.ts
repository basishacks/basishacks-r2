import { DevPermissions } from '~~/shared/permissions'
import { DeleteApplicationsRequest } from '~~/shared/schemas'

export default defineEventHandler(applyRateLimit(async (event) => {
  await requirePermission(event, DevPermissions.PORTAL_APPLICATIONS_DELETE)

  const body = await readValidatedBody(event, DeleteApplicationsRequest.parse)

  await deleteOAuth2Applications(event, body.ids)

  return { message: `Deleted ${body.ids.length} application(s)` }
}))

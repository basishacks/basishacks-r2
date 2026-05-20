import { CreateApplicationRequest } from '~~/shared/schemas'
import { DevPermissions } from '~~/shared/permissions'

export default defineEventHandler(applyRateLimit(async (event) => {
  await requirePermission(event, DevPermissions.PORTAL_APPLICATIONS_CREATE)

  const body = await readValidatedBody(event, CreateApplicationRequest.parse)

  const app = await createOAuth2Application(
    event,
    body.name,
    body.description || null,
    body.proxy_microsoft
  )

  return app
}))

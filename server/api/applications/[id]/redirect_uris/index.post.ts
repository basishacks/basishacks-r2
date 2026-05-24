import { hasPermission, DevPermissions } from '~~/shared/permissions'
import { getOAuth2Application, addOAuth2ApplicationRedirectUri } from '~~/server/utils/database/oauth2_applications'
import { ManageRedirectUriRequest } from '~~/shared/schemas'
import { applyRateLimit } from '~~/server/utils/rateLimit'

export default defineEventHandler(applyRateLimit(async (event) => {
  const user = await requireUser(event)
  const clientID = getRouterParam(event, 'id')!

  const app = await getOAuth2Application(event, clientID)
  if (!app) {
    throw createError({
      status: 404,
      message: 'Application not found'
    })
  }

  const canViewAll = hasPermission(user.role, DevPermissions.PORTAL_APPLICATIONS_VIEW_ALL) ||
    hasPermission(user.role, 'admin')
  const isOwner = app.owner_id === user.id

  if (!canViewAll && !isOwner) {
    throw createError({
      status: 403,
      message: 'Insufficient permissions'
    })
  }

  const body = await readValidatedBody(event, ManageRedirectUriRequest.parse)
  await addOAuth2ApplicationRedirectUri(event, clientID, body.uri)

  return { message: 'Redirect URI added' }
}))

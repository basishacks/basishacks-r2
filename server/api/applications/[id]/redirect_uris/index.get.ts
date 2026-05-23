import { hasPermission, DevPermissions } from '~~/shared/permissions'
import { getOAuth2Application, getOAuth2ApplicationRedirectUris } from '~~/server/utils/database/oauth2_applications'

export default defineEventHandler(async (event) => {
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

  const uris = await getOAuth2ApplicationRedirectUris(event, clientID)
  return uris.map(uri => ({ uri }))
})

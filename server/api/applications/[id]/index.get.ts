import { DevPermissions } from '~~/shared/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, DevPermissions.APPLICATIONS)

  const clientID = getRouterParam(event, 'id')!
  const app = await getOAuth2Application(event, clientID)

  if (!app) {
    throw createError({
      status: 404,
      message: 'Application not found'
    })
  }

  return app
})

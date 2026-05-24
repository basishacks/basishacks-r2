import { DevPermissions } from '~~/shared/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, DevPermissions.PORTAL_APPLICATIONS_VIEW)

  const results = await event.context.db.prepare(
    'SELECT client_id, name, description, redirect_uris, permissions, proxy_microsoft, type, profile_picture, owner_id FROM oauth2_applications ORDER BY name ASC'
  ).all() as { results: Omit<OAuth2Application, 'client_secret'>[] }

  return results.results
})

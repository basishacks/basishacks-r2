import { DevPermissions } from '~~/shared/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, DevPermissions.PORTAL_APPLICATIONS_VIEW)

  const results = await event.context.db.prepare(
    'SELECT * FROM oauth2_applications ORDER BY name ASC'
  ).all() as { results: OAuth2Application[] }

  return results.results
})

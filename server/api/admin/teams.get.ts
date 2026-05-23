import { DevPermissions } from '~~/shared/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, DevPermissions.TEAMS)

  const results = await event.context.db.prepare(
    'SELECT * FROM teams ORDER BY id ASC'
  ).all() as { results: Team[] }

  return results.results
})

import { SetActiveSeasonRequest } from '~~/shared/schemas'
import { DevPermissions } from '~~/shared/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, DevPermissions.PORTAL_SEASONS_EDIT)
  const body = await readValidatedBody(event, SetActiveSeasonRequest.parse)
  await setActiveSeason(event, body.season_id)
  return { message: 'Active season updated' }
})

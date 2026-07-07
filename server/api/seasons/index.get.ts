import { DevPermissions } from "~~/shared/permissions";

export default defineEventHandler(async (event) => {
    await requirePermission(event, DevPermissions.PORTAL_SEASONS_VIEW);
    return await getSeasons(event);
});

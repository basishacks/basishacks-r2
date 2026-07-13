import { DevPermissions, hasPermission } from "~~/shared/permissions";
import { ApplicationIdParams } from "~~/shared/schemas";

export default defineEventHandler(async (event) => {
    const user = await requireUser(event);

    const { id: clientID } = await getValidatedRouterParams(event, ApplicationIdParams.parse);
    const app = await getOAuth2Application(event, clientID);

    if (!app) {
        throw createError({
            status: 404,
            message: "Application not found",
        });
    }

    const canViewAll =
        hasPermission(user.role, DevPermissions.PORTAL_APPLICATIONS_VIEW_ALL) ||
        hasPermission(user.role, "admin");
    const isOwner = app.owner_id === user.id;

    if (!canViewAll && !isOwner) {
        throw createError({
            status: 403,
            message: "Insufficient permissions",
        });
    }

    // Never expose client_secret in API responses
    const { client_secret: _, ...safeApp } = app;
    return safeApp;
});

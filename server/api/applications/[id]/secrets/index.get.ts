import { hasPermission, DevPermissions } from "~~/shared/permissions";
import {
    getOAuth2Application,
    getOAuth2ApplicationSecretAbbreviated,
} from "~~/server/utils/database/oauth2_applications";
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

    const abbreviated = await getOAuth2ApplicationSecretAbbreviated(event, clientID);
    return abbreviated.map((a) => ({ abbreviated: a }));
});

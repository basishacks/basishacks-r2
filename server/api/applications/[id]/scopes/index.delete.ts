import { z } from "zod";
import { hasPermission, DevPermissions } from "~~/shared/permissions";
import {
    getOAuth2Application,
    removeOAuth2ApplicationScope,
} from "~~/server/utils/database/oauth2_applications";

const DeleteScopeRequest = z.object({
    scope: z.string().min(1),
});

export default defineEventHandler(async (event) => {
    const user = await requireUser(event);
    const clientID = getRouterParam(event, "id")!;

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

    const body = await readValidatedBody(event, DeleteScopeRequest.parse);
    await removeOAuth2ApplicationScope(event, clientID, body.scope);

    return { message: "Scope removed" };
});

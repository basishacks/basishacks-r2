import { z } from "zod";
import { hasPermission, DevPermissions } from "~~/shared/permissions";
import {
    getOAuth2Application,
    removeOAuth2ApplicationSecret,
} from "~~/server/utils/database/oauth2_applications";

const DeleteSecretRequest = z.object({
    abbreviated: z.string().min(1),
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

    const body = await readValidatedBody(event, DeleteSecretRequest.parse);
    await removeOAuth2ApplicationSecret(event, clientID, body.abbreviated);

    return { message: "Secret deleted" };
});

import { z } from "zod";
import { hasPermission, DevPermissions } from "~~/shared/permissions";
import {
    getOAuth2Application,
    removeOAuth2ApplicationRedirectUri,
} from "~~/server/utils/database/oauth2_applications";
import { ApplicationIdParams } from "~~/shared/schemas";

const DeleteRedirectUriRequest = z.object({
    uri: z
        .string()
        .min(1, "Redirect URI is required")
        .url("Invalid URL format")
        .max(2048, "Redirect URI is too long"),
});

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

    const body = await readValidatedBody(event, DeleteRedirectUriRequest.parse);
    await removeOAuth2ApplicationRedirectUri(event, clientID, body.uri);

    return { message: "Redirect URI deleted" };
});

import { hasPermission, DevPermissions } from "~~/shared/permissions";
import {
    getOAuth2Application,
    getOAuth2ApplicationScopes,
} from "~~/server/utils/database/oauth2_applications";
import { OAuth2Scopes } from "~~/shared/oauth2-scopes";

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

    const scopes = await getOAuth2ApplicationScopes(event, clientID);
    return scopes.map((scope) => ({
        scope,
        description: OAuth2Scopes[scope]?.description || "Unknown scope",
        adminOnly: OAuth2Scopes[scope]?.adminOnly ?? false,
    }));
});

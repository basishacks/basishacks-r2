import { eq } from "drizzle-orm";
import { DevPermissions, hasPermission } from "~~/shared/permissions";
import { oauth2Applications } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    const user = await requireUser(event);
    const canViewAll =
        hasPermission(user.role, "admin") ||
        hasPermission(user.role, DevPermissions.PORTAL_APPLICATIONS_VIEW_ALL);
    const canViewOwn = hasPermission(user.role, DevPermissions.PORTAL_APPLICATIONS_VIEW);

    if (!canViewAll && !canViewOwn) {
        throw createError({ status: 403, message: "Insufficient permissions" });
    }

    const query = event.context.drizzle
        .select({
            client_id: oauth2Applications.client_id,
            name: oauth2Applications.name,
            description: oauth2Applications.description,
            redirect_uris: oauth2Applications.redirect_uris,
            permissions: oauth2Applications.permissions,
            proxy_microsoft: oauth2Applications.proxy_microsoft,
            type: oauth2Applications.type,
            profile_picture: oauth2Applications.profile_picture,
            owner_id: oauth2Applications.owner_id,
        })
        .from(oauth2Applications);

    const results = (canViewAll ? query : query.where(eq(oauth2Applications.owner_id, user.id)))
        .orderBy(oauth2Applications.name)
        .all();

    return results;
});

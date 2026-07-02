import { DevPermissions } from "~~/shared/permissions";
import { oauth2Applications } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
    await requirePermission(event, DevPermissions.PORTAL_APPLICATIONS_VIEW);

    const results = event.context.drizzle
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
        .from(oauth2Applications)
        .orderBy(oauth2Applications.name)
        .all();

    return results;
});

import { z } from "zod";
import { hasPermission, DevPermissions } from "~~/shared/permissions";
import {
    getOAuth2Application,
    addOAuth2ApplicationScopes,
} from "~~/server/utils/database/oauth2_applications";
import { OAuth2ScopesList, isAdminScope } from "~~/shared/oauth2-scopes";
import { applyRateLimit } from "~~/server/utils/rateLimit";
import { ApplicationIdParams } from "~~/shared/schemas";

const AddScopesRequest = z.object({
    scopes: z
        .array(z.string().min(1).max(128, "Scope is too long"))
        .min(1, "At least one scope is required")
        .max(50, "Too many scopes"),
});

export default defineEventHandler(
    applyRateLimit(async (event) => {
        const user = await requireUser(event);
        const { id: clientID } = await getValidatedRouterParams(event, ApplicationIdParams.parse);

        const app = await getOAuth2Application(event, clientID);
        if (!app) {
            throw createError({
                status: 404,
                message: "Application not found",
            });
        }

        const isAdmin =
            hasPermission(user.role, DevPermissions.PORTAL_APPLICATIONS_VIEW_ALL) ||
            hasPermission(user.role, "admin");
        const isOwner = app.owner_id === user.id;

        if (!isAdmin && !isOwner) {
            throw createError({
                status: 403,
                message: "Insufficient permissions",
            });
        }

        const body = await readValidatedBody(event, AddScopesRequest.parse);

        const invalid = body.scopes.filter((s) => !OAuth2ScopesList.includes(s));
        if (invalid.length > 0) {
            throw createError({
                status: 400,
                message: `Invalid scope(s): ${invalid.join(", ")}`,
            });
        }

        const adminScopes = body.scopes.filter((s) => isAdminScope(s));
        if (adminScopes.length > 0 && !isAdmin) {
            throw createError({
                status: 403,
                message: `Admin permission required for scope(s): ${adminScopes.join(", ")}`,
            });
        }

        await addOAuth2ApplicationScopes(event, clientID, body.scopes);

        return { message: "Scopes added" };
    }),
);

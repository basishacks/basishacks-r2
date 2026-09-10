import type { H3Event } from "h3";
import type { PermissionRequirement } from "@basis/schema/permissions";
import { hasNethackPermission } from "~~/shared/permissions";
import { resolveOAuth2User, verifyOAuth2JWT } from "./oauth2-jwt";

export async function requireUser(event: H3Event, permissions?: PermissionRequirement) {
    const payload = event.context.oauth2?.payload ?? (await verifyOAuth2JWT(event));
    if (permissions && !hasNethackPermission(payload.permissions, permissions)) {
        throw createError({
            statusCode: 403,
            statusMessage: "insufficient_permission",
            message: "The access token lacks a required permission",
        });
    }
    const user = event.context.oauth2?.user ?? (await resolveOAuth2User(event, payload));
    event.context.oauth2 = { payload, permissions: payload.permissions, user };
    return user;
}

export async function optionalUser(event: H3Event) {
    if (!getHeader(event, "authorization")) return undefined;
    return await requireUser(event);
}

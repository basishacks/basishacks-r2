import type { H3Event } from "h3";
import type { PermissionRequirement } from "@basis/schema/permissions";
import { hasPermission } from "~~/shared/permissions";
import { requireDelegatedScopes, resolveOAuth2User, verifyOAuth2JWT } from "./oauth2-jwt";

export async function requireUser(event: H3Event, scopes?: PermissionRequirement) {
    const payload = event.context.oauth2?.payload ?? (await verifyOAuth2JWT(event));
    if (scopes) requireDelegatedScopes(payload.scope, scopes);
    const user = event.context.oauth2?.user ?? (await resolveOAuth2User(event, payload));
    event.context.oauth2 = { payload, scopes: payload.scope.split(" ").filter(Boolean), user };
    return user;
}

export async function optionalUser(event: H3Event) {
    if (!getHeader(event, "authorization")) return undefined;
    return await requireUser(event);
}

export async function requireJudge(event: H3Event, scopes?: PermissionRequirement) {
    const user = await requireUser(event, scopes);
    if (!hasPermission(user.role, "admin") && !hasPermission(user.role, "judge")) {
        throw createError({ status: 403, message: "Insufficient permissions" });
    }
    return user;
}

export async function requireAdmin(event: H3Event, scopes?: PermissionRequirement) {
    const user = await requireUser(event, scopes);
    if (!hasPermission(user.role, "admin")) {
        throw createError({ status: 403, message: "Insufficient permissions" });
    }
    return user;
}

export async function requirePermission(
    event: H3Event,
    permission: string,
    scopes?: PermissionRequirement,
) {
    const user = await requireUser(event, scopes);
    if (!hasPermission(user.role, permission) && !hasPermission(user.role, "admin")) {
        throw createError({ status: 403, message: "Insufficient permissions" });
    }
    return user;
}

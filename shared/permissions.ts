export const VotePermissions = {
    VOTE: "sc.vote",
} as const;

export const DevPermissions = {
    USERS: "dev_users",
    TEAMS: "dev_teams",
    DEBUG: "dev_debug",
    DEEPSEEK: "dev_deepseek",
    PORTAL_USERS_VIEW: "portal.users.view",
    PORTAL_DEBUG_VIEW: "portal.debug.view",
    PORTAL_TEAMS_VIEW: "portal.teams.view", // used for all access for teams
    PORTAL_DEEPSEEK_VIEW: "portal.deepseek.view",
    PORTAL_SEASONS_VIEW: "portal.seasons.view",
    PORTAL_SEASONS_EDIT: "portal.seasons.edit",
} as const;

export function parsePermissions(role: string | null | undefined): string[] {
    if (!role) return [];
    let decoded: string;
    try {
        decoded = decodeURIComponent(role);
    } catch {
        // URIError on malformed sequences (e.g. trailing %); fall back to raw
        decoded = role;
    }
    return decoded.split(" ").filter(Boolean);
}

export function hasPermission(role: string | null | undefined, permission: string): boolean {
    return parsePermissions(role).includes(permission);
}

export function addPermission(role: string | null | undefined, permission: string): string {
    const perms = parsePermissions(role);
    if (perms.includes(permission)) {
        return serializePermissions(perms);
    }
    return serializePermissions([...perms, permission]);
}

export function removePermission(role: string | null | undefined, permission: string): string {
    return serializePermissions(parsePermissions(role).filter((p) => p !== permission));
}

function serializePermissions(perms: string[]): string {
    return perms.map((p) => encodeURIComponent(p)).join(" ");
}
import { definePermissionTree } from "@basis/schema/permissions";

export const NethackScopes = definePermissionTree({
    Profile: { read: true, write: true },
    Projects: { read: { self: true, others: true }, write: { self: true } },
    Teams: { read: { self: true, others: true }, write: { self: true, others: true } },
    Voting: { read: { self: true }, write: { self: true } },
    Judging: { read: { assigned: true }, write: { assigned: true } },
    Seasons: { create: true, update: true, delete: true, activate: true },
    Files: { read: { debug: true }, write: { debug: true } },
    Chatbot: { use: true },
    Database: { export: true },
});

export const NETHACK_REQUESTED_SCOPES = [
    "openid",
    "profile",
    "email",
    "offline_access",
    "Profile.all",
    "Projects.read.all",
    NethackScopes.Projects.write.self,
    "Teams.all",
    "Voting.all",
    "Judging.all",
    "Seasons.all",
    "Files.all",
    NethackScopes.Chatbot.use,
    NethackScopes.Database.export,
] as const;

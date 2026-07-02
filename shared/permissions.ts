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
    PORTAL_APPLICATIONS_VIEW: "portal.applications.view",
    PORTAL_APPLICATIONS_CREATE: "portal.applications.create",
    PORTAL_APPLICATIONS_CREATE_FIRST_PARTY: "portal.applications.create.firstparty",
    PORTAL_APPLICATIONS_DELETE: "portal.applications.delete",
    PORTAL_APPLICATIONS_VIEW_ALL: "portal.applications.view.all",
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

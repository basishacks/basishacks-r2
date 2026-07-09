import { describe, it, expect } from "vitest";
import {
    parsePermissions,
    hasPermission,
    addPermission,
    removePermission,
    VotePermissions,
    DevPermissions,
} from "~~/shared/permissions";

describe("parsePermissions", () => {
    it("parses a normal role string with single permission", () => {
        const result = parsePermissions("sc.vote");
        expect(result).toEqual(["sc.vote"]);
    });

    it("parses a role string with multiple permissions", () => {
        const result = parsePermissions("sc.vote dev_users dev_teams");
        expect(result).toEqual(["sc.vote", "dev_users", "dev_teams"]);
    });

    it("returns an empty array for an empty string", () => {
        const result = parsePermissions("");
        expect(result).toEqual([]);
    });

    it("returns an empty array for null", () => {
        const result = parsePermissions(null);
        expect(result).toEqual([]);
    });

    it("returns an empty array for undefined", () => {
        const result = parsePermissions(undefined);
        expect(result).toEqual([]);
    });

    it("handles whitespace-only strings", () => {
        const result = parsePermissions("   ");
        expect(result).toEqual([]);
    });

    it("trims surrounding whitespace from permissions", () => {
        const result = parsePermissions("  sc.vote  dev_users  ");
        expect(result).toEqual(["sc.vote", "dev_users"]);
    });

    it("decodes URI-encoded permissions", () => {
        const result = parsePermissions("portal.users.view%20portal.teams.view");
        // The space is already a separator, but encodeURIComponent of a space is %20
        // which gets decoded back to a space, then split, then filtered
        expect(result).toEqual(["portal.users.view", "portal.teams.view"]);
    });

    it("does not throw on malformed URI sequences", () => {
        expect(() => parsePermissions("admin%")).not.toThrow();
        expect(() => parsePermissions("%ZZ")).not.toThrow();
    });

    it("falls back to raw string on malformed URI sequences", () => {
        const result = parsePermissions("sc.vote admin%");
        expect(result).toEqual(["sc.vote", "admin%"]);
    });
});

describe("hasPermission", () => {
    it("returns true when the role has the permission", () => {
        expect(hasPermission("sc.vote dev_users", "sc.vote")).toBe(true);
    });

    it("returns false when the role does not have the permission", () => {
        expect(hasPermission("sc.vote", "dev_users")).toBe(false);
    });

    it("returns false for a null role", () => {
        expect(hasPermission(null, "sc.vote")).toBe(false);
    });

    it("returns false for an undefined role", () => {
        expect(hasPermission(undefined, "sc.vote")).toBe(false);
    });

    it("returns false for an empty role string", () => {
        expect(hasPermission("", "sc.vote")).toBe(false);
    });
});

describe("addPermission", () => {
    it("adds a new permission to an existing role", () => {
        const result = addPermission("sc.vote", "dev_users");
        const perms = parsePermissions(result);
        expect(perms).toContain("sc.vote");
        expect(perms).toContain("dev_users");
        expect(perms).toHaveLength(2);
    });

    it("does not add a duplicate permission", () => {
        const result = addPermission("sc.vote dev_users", "sc.vote");
        const perms = parsePermissions(result);
        expect(perms).toEqual(["sc.vote", "dev_users"]);
    });

    it("adds a permission to a null role", () => {
        const result = addPermission(null, "sc.vote");
        const perms = parsePermissions(result);
        expect(perms).toEqual(["sc.vote"]);
    });

    it("adds a permission to an undefined role", () => {
        const result = addPermission(undefined, "sc.vote");
        const perms = parsePermissions(result);
        expect(perms).toEqual(["sc.vote"]);
    });

    it("adds a permission to an empty role string", () => {
        const result = addPermission("", "dev_users");
        const perms = parsePermissions(result);
        expect(perms).toEqual(["dev_users"]);
    });

    it("preserves existing permissions when adding a new one", () => {
        const result = addPermission("sc.vote dev_teams", "dev_users");
        const perms = parsePermissions(result);
        expect(perms).toContain("sc.vote");
        expect(perms).toContain("dev_teams");
        expect(perms).toContain("dev_users");
        expect(perms).toHaveLength(3);
    });
});

describe("removePermission", () => {
    it("removes an existing permission", () => {
        const result = removePermission("sc.vote dev_users", "sc.vote");
        const perms = parsePermissions(result);
        expect(perms).toEqual(["dev_users"]);
    });

    it("does nothing when removing a non-existing permission", () => {
        const result = removePermission("sc.vote", "dev_users");
        const perms = parsePermissions(result);
        expect(perms).toEqual(["sc.vote"]);
    });

    it("returns an empty string when removing from null", () => {
        const result = removePermission(null, "sc.vote");
        expect(result).toBe("");
    });

    it("returns an empty string when removing from undefined", () => {
        const result = removePermission(undefined, "sc.vote");
        expect(result).toBe("");
    });

    it("returns an empty string when removing the only permission", () => {
        const result = removePermission("sc.vote", "sc.vote");
        const perms = parsePermissions(result);
        expect(perms).toEqual([]);
    });

    it("only removes the specified permission, not others", () => {
        const result = removePermission("sc.vote dev_users dev_teams", "dev_users");
        const perms = parsePermissions(result);
        expect(perms).toContain("sc.vote");
        expect(perms).toContain("dev_teams");
        expect(perms).not.toContain("dev_users");
        expect(perms).toHaveLength(2);
    });
});

describe("permissions round-trip", () => {
    it("add then remove returns the original", () => {
        const original = "sc.vote";
        const afterAdd = addPermission(original, "dev_users");
        const afterRemove = removePermission(afterAdd, "dev_users");
        expect(afterRemove).toBe(original);
    });

    it("remove then add returns the original", () => {
        const original = "sc.vote dev_users";
        const afterRemove = removePermission(original, "dev_users");
        const afterAdd = addPermission(afterRemove, "dev_users");
        const originalPerms = parsePermissions(original).sort();
        const finalPerms = parsePermissions(afterAdd).sort();
        expect(finalPerms).toEqual(originalPerms);
    });
});

describe("VotePermissions", () => {
    it("has the VOTE permission", () => {
        expect(VotePermissions.VOTE).toBe("sc.vote");
    });
});

describe("DevPermissions", () => {
    it("has all expected permission keys", () => {
        expect(DevPermissions.USERS).toBe("dev_users");
        expect(DevPermissions.TEAMS).toBe("dev_teams");
        expect(DevPermissions.DEBUG).toBe("dev_debug");
        expect(DevPermissions.DEEPSEEK).toBe("dev_deepseek");
        expect(DevPermissions.PORTAL_USERS_VIEW).toBe("portal.users.view");
        expect(DevPermissions.PORTAL_DEBUG_VIEW).toBe("portal.debug.view");
        expect(DevPermissions.PORTAL_TEAMS_VIEW).toBe("portal.teams.view");
        expect(DevPermissions.PORTAL_DEEPSEEK_VIEW).toBe("portal.deepseek.view");
        expect(DevPermissions.PORTAL_APPLICATIONS_VIEW).toBe("portal.applications.view");
        expect(DevPermissions.PORTAL_APPLICATIONS_CREATE).toBe("portal.applications.create");
        expect(DevPermissions.PORTAL_APPLICATIONS_CREATE_FIRST_PARTY).toBe(
            "portal.applications.create.firstparty",
        );
        expect(DevPermissions.PORTAL_APPLICATIONS_DELETE).toBe("portal.applications.delete");
        expect(DevPermissions.PORTAL_APPLICATIONS_VIEW_ALL).toBe("portal.applications.view.all");
        expect(DevPermissions.PORTAL_SEASONS_VIEW).toBe("portal.seasons.view");
        expect(DevPermissions.PORTAL_SEASONS_EDIT).toBe("portal.seasons.edit");
    });
});

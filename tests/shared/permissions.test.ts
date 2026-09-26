import { describe, expect, it } from "vitest";
import {
    expandLegacyNethackPermissions,
    hasNethackPermission,
    NethackPermissions,
} from "~~/shared/permissions";

describe("nethack permission helpers", () => {
    it("returns no effective permissions for a missing grant list", () => {
        expect(expandLegacyNethackPermissions(undefined)).toEqual([]);
    });

    it("matches permissions case-insensitively", () => {
        expect(
            hasNethackPermission(
                ["NETHACK.PROFILE.UPDATESELF"],
                NethackPermissions.Profile.updateSelf,
            ),
        ).toBe(true);
    });

    it("supports all-of permission requirements", () => {
        expect(
            hasNethackPermission([NethackPermissions.Teams.list, NethackPermissions.Teams.delete], {
                allOf: [NethackPermissions.Teams.list, NethackPermissions.Teams.delete],
            }),
        ).toBe(true);
    });

    it("does not let participant compatibility grants satisfy administrative permissions", () => {
        expect(hasNethackPermission(["participant"], NethackPermissions.Users.delete)).toBe(false);
    });

    it("lets the legacy admin grant satisfy every nethack leaf", () => {
        expect(hasNethackPermission(["admin"], NethackPermissions.Seasons.delete)).toBe(true);
    });
});

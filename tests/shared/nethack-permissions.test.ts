import { describe, expect, it } from "vitest";
import { hasNethackPermission, NethackPermissions } from "~~/shared/permissions";

describe("NethackPermissions", () => {
    it("uses canonical least-privilege JWT permission names", () => {
        expect(NethackPermissions.Projects.submitOwn).toBe("nethack.Projects.submitOwn");
        expect(NethackPermissions.Judging.resultsCompute).toBe(
            "nethack.Judging.resultsCompute",
        );
    });

    it("requires an exact leaf permission", () => {
        expect(
            hasNethackPermission(
                [NethackPermissions.Projects.updateOwn],
                NethackPermissions.Projects.submitOwn,
            ),
        ).toBe(false);
    });

    it("lets the explicit nethack.all administrative grant satisfy leaves", () => {
        expect(
            hasNethackPermission([NethackPermissions.all], NethackPermissions.Database.export),
        ).toBe(true);
    });
});

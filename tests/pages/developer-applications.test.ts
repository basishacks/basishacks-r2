import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const applicationsIndexSource = readFileSync(
    resolve(
        import.meta.dirname,
        "..",
        "..",
        "app",
        "pages",
        "developers",
        "applications",
        "index.vue",
    ),
    "utf-8",
);
const applicationDetailSource = readFileSync(
    resolve(
        import.meta.dirname,
        "..",
        "..",
        "app",
        "pages",
        "developers",
        "applications",
        "[id].vue",
    ),
    "utf-8",
);

describe("developer applications pages", () => {
    it("uses granular permissions for application actions", () => {
        expect(applicationsIndexSource).toContain("DevPermissions.PORTAL_APPLICATIONS_CREATE");
        expect(applicationsIndexSource).toContain("DevPermissions.PORTAL_APPLICATIONS_DELETE");
        expect(applicationDetailSource).toContain("DevPermissions.PORTAL_APPLICATIONS_VIEW_ALL");
    });
});

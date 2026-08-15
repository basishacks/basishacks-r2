import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("developer portal access guard", () => {
    it("requires admin access for the developer dashboard", () => {
        const source = readFileSync(
            resolve(import.meta.dirname, "..", "..", "app", "layouts", "developers-dashboard.vue"),
            "utf-8",
        );
        expect(source).toContain("throw createError");
        expect(source).not.toContain("/developers/applications");
        expect(source).toContain("statusCode: 403");
        expect(source).toContain('id: "pages"');
    });
});

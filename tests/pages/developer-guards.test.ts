import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("developer portal access guard", () => {
    it("enforces admin-only access in the dashboard layout", () => {
        const source = readFileSync(
            resolve(import.meta.dirname, "..", "..", "app", "layouts", "developers-dashboard.vue"),
            "utf-8",
        );
        expect(source).toContain("throw createError");
        expect(source).toContain('role !== "admin"');
        expect(source).toContain("statusCode: 403");
    });
});

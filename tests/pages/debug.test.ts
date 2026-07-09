import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
    resolve(import.meta.dirname, "..", "..", "app", "pages", "debug.vue"),
    "utf-8",
);

describe("Debug page", () => {
    it("uses auth middleware and requires admin access", () => {
        expect(source).toContain('middleware: ["auth"]');
        expect(source).toContain('if (!hasPermission(me.value?.role, "admin"))');
        expect(source).toContain('throw await navigateTo("/")');
    });
});

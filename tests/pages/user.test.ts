import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
    resolve(import.meta.dirname, "..", "..", "app", "pages", "user", "index.vue"),
    "utf-8",
);

describe("User index page", () => {
    it("redirects unauthenticated users to login and throws navigation", () => {
        expect(source).toContain('throw await navigateTo("/api/login")');
        expect(source).toContain('throw await navigateTo("/user/" + userID.value)');
    });
});

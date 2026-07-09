import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
    resolve(import.meta.dirname, "..", "..", "app", "components", "RoleHeader.vue"),
    "utf-8",
);

describe("RoleHeader.vue", () => {
    it("uses useApiUser instead of useUserSession and useFetch for the user", () => {
        expect(source).toContain("useApiUser");
        expect(source).not.toContain("useFetch<GetUserResponse>");
        expect(source).not.toContain("useUserSession()");
    });
});

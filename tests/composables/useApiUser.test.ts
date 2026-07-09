import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
    resolve(import.meta.dirname, "..", "..", "app", "composables", "useApiUser.ts"),
    "utf-8",
);

describe("useApiUser composable", () => {
    it("uses useUserSession internally", () => {
        expect(source).toContain("useUserSession()");
    });

    it("uses useFetch<GetUserResponse>", () => {
        expect(source).toContain("useFetch<GetUserResponse>");
    });

    it("null checks userID", () => {
        expect(source).toContain("!userID.value");
    });
});

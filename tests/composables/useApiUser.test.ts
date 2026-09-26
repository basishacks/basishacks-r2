import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
    resolve(import.meta.dirname, "..", "..", "app", "composables", "useApiUser.ts"),
    "utf-8",
);

describe("useApiUser composable", () => {
    it("uses the basis-auth cookie session composable internally", () => {
        expect(source).toContain("useBasisAuthSession()");
    });

    it("types the user API response", () => {
        expect(source).toContain("type ApiUser = GetUserResponse | null");
        expect(source).toContain("useFetch<ApiUser>");
    });

    it("null checks userID", () => {
        expect(source).toContain("!userID.value");
    });
});

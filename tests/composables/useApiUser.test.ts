import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
    resolve(import.meta.dirname, "..", "..", "app", "composables", "useApiUser.ts"),
    "utf-8",
);

describe("useApiUser composable", () => {
    it("returns null instead of empty string for the fetch URL when unauthenticated", () => {
        expect(source).not.toContain("`/api/users/${userID.value}` : ``");
        expect(source).toContain("`/api/users/${userID.value}` : null");
        expect(source).toContain("useFetch<GetUserResponse>");
    });
});

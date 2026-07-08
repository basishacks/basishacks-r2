import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
    resolve(import.meta.dirname, "..", "..", "app", "composables", "useAPIUser.ts"),
    "utf-8",
);

describe("useAPIUser composable", () => {
    it("uses useUserSession internally", () => {
        expect(source).toContain("useUserSession()");
    });

    it("resolves the fetch URL to null when the session user id is missing", () => {
        expect(source).not.toContain("`/api/users/${userID.value}` : ``");
        expect(source).not.toContain("`/api/users/${userID.value}` : \"\"");
        expect(source).toContain("`/api/users/${userID.value}` : null");
    });

    it("uses useFetch<GetUserResponse> with an id guard", () => {
        expect(source).toContain("useFetch<GetUserResponse>");
        expect(source).toContain("userID.value ?");
    });
});

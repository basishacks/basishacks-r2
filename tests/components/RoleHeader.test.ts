import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
    resolve(import.meta.dirname, "..", "..", "app", "components", "RoleHeader.vue"),
    "utf-8",
);

describe("RoleHeader.vue", () => {
    it("does not fetch /api/users/undefined when the user id is missing", () => {
        expect(source).not.toContain("`/api/users/${userRef.value?.id}`");
        expect(source).toContain("userRef.value?.id ? `/api/users/${userRef.value.id}` : null");
    });
});

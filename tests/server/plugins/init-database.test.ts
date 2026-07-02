import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
    resolve(import.meta.dirname, "..", "..", "..", "server", "plugins", "init-database.ts"),
    "utf-8",
);

describe("init-database plugin", () => {
    it("uses defineNitroPlugin so nitroApp is typed", () => {
        expect(source).toContain("export default defineNitroPlugin(");
        expect(source).toContain('nitroApp.hooks.hook("request"');
    });
});

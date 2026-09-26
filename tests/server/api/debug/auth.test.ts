import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const filesSource = readFileSync(
    resolve(import.meta.dirname, "..", "..", "..", "..", "server", "api", "debug", "files.get.ts"),
    "utf-8",
);
const sessionSource = readFileSync(
    resolve(
        import.meta.dirname,
        "..",
        "..",
        "..",
        "..",
        "server",
        "api",
        "debug",
        "deepseek",
        "sessions",
        "[id]",
        "index.get.ts",
    ),
    "utf-8",
);

describe("debug endpoints are protected", () => {
    it("files.get.ts requires permission", () => {
        expect(filesSource).toContain("requireUser");
        expect(filesSource).toContain("NethackPermissions.Debug.filesRead");
    });

    it("deepseek session get requires permission", () => {
        expect(sessionSource).toContain("requireUser");
        expect(sessionSource).toContain("NethackPermissions.Debug.deepseekRead");
    });
});

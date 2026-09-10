import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
    resolve(
        import.meta.dirname,
        "..",
        "..",
        "..",
        "..",
        "server",
        "api",
        "debug",
        "upload.post.ts",
    ),
    "utf-8",
);

describe("debug upload endpoint", () => {
    it("requires an authenticated user", () => {
        expect(source).toContain('import { requirePermission } from "~~/server/utils/auth"');
        expect(source).toContain(
            'await requirePermission(event, DevPermissions.DEBUG, "Files.write.debug")',
        );
    });

    it("whitelists file extensions", () => {
        expect(source).toContain("ALLOWED_EXTENSIONS");
        expect(source).toContain("File extension not allowed");
        expect(source).toContain("ALLOWED_EXTENSIONS.has(extension)");
    });
});

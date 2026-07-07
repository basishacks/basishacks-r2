import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const files = [
    "server/api/debug/deepseek/sessions/[id]/index.get.ts",
    "server/api/debug/deepseek/sessions/[id]/index.delete.ts",
    "server/api/debug/deepseek/sessions/index.post.ts",
    "server/api/debug/deepseek/sessions/[id]/message.post.ts",
    "server/api/oauth2/token.post.ts",
    "server/api/_webhooks/lifecycle.post.ts",
];

describe("API error messages do not leak internal details", () => {
    for (const file of files) {
        it(`${file} avoids concatenating raw error messages`, () => {
            const source = readFileSync(resolve(import.meta.dirname, "..", "..", file), "utf-8");
            expect(source).not.toMatch(/statusMessage:.*\+\s*error\.message/);
            expect(source).not.toMatch(/message:.*\+\s*e\.message/);
        });
    }

    it("webhook lifecycle throws createError instead of returning it", () => {
        const source = readFileSync(
            resolve(
                import.meta.dirname,
                "..",
                "..",
                "server",
                "api",
                "_webhooks",
                "lifecycle.post.ts",
            ),
            "utf-8",
        );
        expect(source).not.toMatch(/return createError\(/);
    });
});

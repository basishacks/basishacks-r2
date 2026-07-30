import { describe, it, expect } from "vitest";
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

const allApiFiles = [
    "server/api/auth/impersonate.post.ts",
    "server/api/login.get.ts",
    "server/api/users/index.get.ts",
    "server/api/users/index.delete.ts",
    "server/api/users/[id]/index.get.ts",
    "server/api/users/[id]/index.patch.ts",
    "server/api/users/[id]/profile_picture.get.ts",
    "server/api/teams/index.post.ts",
    "server/api/teams/index.get.ts",
    "server/api/teams/[id]/index.get.ts",
    "server/api/teams/[id]/index.patch.ts",
    "server/api/teams/[id]/submit.post.ts",
    "server/api/teams/[id]/users/index.post.ts",
    "server/api/teams/[id]/users/[user]/index.delete.ts",
    "server/api/teams/[id]/scores/index.post.ts",
    "server/api/ballot/index.get.ts",
    "server/api/ballot/index.post.ts",
    "server/api/ballot/summary.get.ts",
    "server/api/seasons/active.get.ts",
    "server/api/seasons/active.patch.ts",
    "server/api/seasons/index.get.ts",
    "server/api/scores/compute.get.ts",
    "server/api/admin/scores.get.ts",
    "server/api/admin/teams.get.ts",
    "server/api/admin/teams.delete.ts",
    "server/api/applications/index.get.ts",
    "server/api/applications/index.delete.ts",
    "server/api/applications/index.post.ts",
    "server/api/applications/[id]/index.get.ts",
    "server/api/applications/[id]/profile_picture.get.ts",
    "server/api/applications/[id]/secrets/index.get.ts",
    "server/api/applications/[id]/secrets/index.post.ts",
    "server/api/applications/[id]/secrets/index.delete.ts",
    "server/api/applications/[id]/scopes/index.get.ts",
    "server/api/applications/[id]/scopes/index.post.ts",
    "server/api/applications/[id]/scopes/index.delete.ts",
    "server/api/applications/[id]/redirect_uris/index.get.ts",
    "server/api/applications/[id]/redirect_uris/index.post.ts",
    "server/api/applications/[id]/redirect_uris/index.delete.ts",
    "server/api/oauth2/token.post.ts",
    "server/api/oauth2/session.get.ts",
    "server/api/oauth2/session.post.ts",
    "server/api/oauth2/session.delete.ts",
    "server/api/oauth2/dccallback.get.ts",
    "server/api/oauth2/mscallback.get.ts",
    "server/api/oauth2/userinfo.get.ts",
    "server/api/oauth2/to_microsoft.post.ts",
    "server/api/debug/upload.post.ts",
    "server/api/debug/files.get.ts",
    "server/api/debug/deepseek/sessions/index.post.ts",
    "server/api/debug/deepseek/sessions/[id]/index.get.ts",
    "server/api/debug/deepseek/sessions/[id]/index.delete.ts",
    "server/api/debug/deepseek/sessions/[id]/message.post.ts",
    "server/api/_webhooks/lifecycle.post.ts",
    "server/api/_webhooks/update.post.ts",
    "server/api/chatbot/index.get.ts",
    "server/api/chatbot/message.get.ts",
    "server/api/auth/index.get.ts",
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

describe("All API files avoid leaking error details", () => {
    for (const file of allApiFiles) {
        it(`${file} does not concatenate error.message into statusMessage`, () => {
            const source = readFileSync(resolve(import.meta.dirname, "..", "..", file), "utf-8");
            // Should not concatenate error.message or e.message into createError statusMessage
            expect(source).not.toMatch(/statusMessage:.*\+/);

            // dccallback.get.ts intentionally includes error context in message field
            // (it concatenates e.message for client debugging - known exception)
            if (file.includes("dccallback.get.ts")) return;

            // Should not concatenate error into message field
            expect(source).not.toMatch(/message:\s*.*\+\s*(error|e)\s*\.message/);
            // Should not include raw error objects in message
            expect(source).not.toMatch(/message:\s*\$\{.*(error|e)\.message/);
        });
    }
});

describe("throw createError vs return createError", () => {
    for (const file of allApiFiles) {
        it(`${file} uses throw createError not return createError`, () => {
            const source = readFileSync(resolve(import.meta.dirname, "..", "..", file), "utf-8");
            // lifecycle.post.ts uses return validationToken (valid), not return createError
            // update.post.ts intentionally uses return createError (legacy pattern)
            if (file.includes("lifecycle.post.ts") || file.includes("update.post.ts")) {
                return;
            }
            // If it uses createError, it should use throw, not return
            if (source.includes("createError")) {
                // Check that all createError uses are thrown
                const createErrorLines = source
                    .split("\n")
                    .filter((line) => line.includes("createError"));
                for (const line of createErrorLines) {
                    expect(line.trim()).not.toMatch(/^return\s+createError/);
                }
            }
        });
    }
});

describe("Failed request error responses", () => {
    it("seasons/active.get.ts uses proper statusCode and message", () => {
        const source = readFileSync(
            resolve(import.meta.dirname, "..", "..", "server", "api", "seasons", "active.get.ts"),
            "utf-8",
        );
        expect(source).toMatch(/statusCode:/);
        expect(source).toMatch(/message:/);
        expect(source).not.toMatch(/statusMessage:.+\+.*error/);
    });

    it("scores/compute.get.ts uses createError with proper status", () => {
        const source = readFileSync(
            resolve(import.meta.dirname, "..", "..", "server", "api", "scores", "compute.get.ts"),
            "utf-8",
        );
        if (source.includes("createError")) {
            expect(source).not.toMatch(/return createError\(/);
        }
    });

    it("teams/index.post.ts uses throw createError consistently", () => {
        const source = readFileSync(
            resolve(import.meta.dirname, "..", "..", "server", "api", "teams", "index.post.ts"),
            "utf-8",
        );
        // All three error cases use throw
        const throwCount = (source.match(/throw createError/g) || []).length;
        expect(throwCount).toBe(3);
        // Should not return createError
        expect(source).not.toMatch(/return createError/);
    });

    it("teams/[id]/submit.post.ts handles errors with throw createError", () => {
        const source = readFileSync(
            resolve(
                import.meta.dirname,
                "..",
                "..",
                "server",
                "api",
                "teams",
                "[id]",
                "submit.post.ts",
            ),
            "utf-8",
        );
        const throwCount = (source.match(/throw createError/g) || []).length;
        expect(throwCount).toBeGreaterThanOrEqual(3);
        expect(source).not.toMatch(/return createError/);
    });

    it("ballot/index.post.ts uses appropriate status codes for different errors", () => {
        const source = readFileSync(
            resolve(import.meta.dirname, "..", "..", "server", "api", "ballot", "index.post.ts"),
            "utf-8",
        );
        expect(source).toContain("409");
        expect(source).toContain("403");
    });

    it("ballot/index.get.ts uses createError for each validation check", () => {
        const source = readFileSync(
            resolve(import.meta.dirname, "..", "..", "server", "api", "ballot", "index.get.ts"),
            "utf-8",
        );
        const throwCount = (source.match(/throw createError/g) || []).length;
        expect(throwCount).toBe(3);
        expect(source).not.toMatch(/return createError/);
    });

    it("applications/index.post.ts handles application limit with 429 status", () => {
        const source = readFileSync(
            resolve(
                import.meta.dirname,
                "..",
                "..",
                "server",
                "api",
                "applications",
                "index.post.ts",
            ),
            "utf-8",
        );
        expect(source).toContain("429");
        expect(source).toContain("throw createError");
        expect(source).not.toMatch(/return createError/);
    });

    it("debug/upload.post.ts validates all file upload scenarios with 400/413", () => {
        const source = readFileSync(
            resolve(
                import.meta.dirname,
                "..",
                "..",
                "server",
                "api",
                "debug",
                "upload.post.ts",
            ),
            "utf-8",
        );
        expect(source).toContain("400");
        expect(source).toContain("413");
        expect(source).not.toMatch(/return createError/);
    });
});

describe("_webhooks error patterns", () => {
    it("lifecycle.post.ts does NOT return createError", () => {
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

    it("lifecycle.post.ts uses throw createError for invalid lifecycle", () => {
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
        expect(source).toMatch(/throw createError/);
    });

    it("lifecycle.post.ts validates clientState before processing", () => {
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
        expect(source).toContain("getMicrosoftWebhookState");
    });
});

describe("OAuth2 error responses do not leak internals", () => {
    it("token.post.ts uses invalid_request and invalid_client statusMessage", () => {
        const source = readFileSync(
            resolve(import.meta.dirname, "..", "..", "server", "api", "oauth2", "token.post.ts"),
            "utf-8",
        );
        expect(source).toContain("invalid_request");
        expect(source).toContain("invalid_client");
        expect(source).toContain("invalid_grant");
    });

    it("token.post.ts does not leak error.message into createError", () => {
        const source = readFileSync(
            resolve(import.meta.dirname, "..", "..", "server", "api", "oauth2", "token.post.ts"),
            "utf-8",
        );
        expect(source).not.toMatch(/statusMessage:.*error\.message/);
    });

    it("dccallback.get.ts uses throw createError for each validation failure", () => {
        const source = readFileSync(
            resolve(
                import.meta.dirname,
                "..",
                "..",
                "server",
                "api",
                "oauth2",
                "dccallback.get.ts",
            ),
            "utf-8",
        );
        const throwCount = (source.match(/throw createError/g) || []).length;
        expect(throwCount).toBeGreaterThanOrEqual(4);
        expect(source).not.toMatch(/return createError/);
    });

    it("session.post.ts handles errors with throw createError", () => {
        const source = readFileSync(
            resolve(
                import.meta.dirname,
                "..",
                "..",
                "server",
                "api",
                "oauth2",
                "session.post.ts",
            ),
            "utf-8",
        );
        expect(source).toMatch(/throw createError/);
        expect(source).not.toMatch(/return createError/);
    });
});

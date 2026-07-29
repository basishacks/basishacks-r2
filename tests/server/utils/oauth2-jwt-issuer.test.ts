import { describe, it, expect, beforeEach } from "vitest";
import { SignJWT } from "jose";
import { verifyAccessToken } from "~~/server/utils/oauth2-jwt";

beforeEach(() => {
    process.env.NUXT_OAUTH2_JWT_SECRET = "test-secret-key-at-least-32-bytes!!";
    process.env.CURRENT_URL_ORIGIN = "http://localhost:3000";
    (globalThis as any).createError = (input: any) => {
        const err = new Error(input.message || input.statusMessage || "Error");
        (err as any).statusCode = input.statusCode ?? input.status ?? 500;
        (err as any).statusMessage = input.statusMessage;
        return err;
    };
});

function getKey(): Uint8Array {
    return new TextEncoder().encode(process.env.NUXT_OAUTH2_JWT_SECRET);
}

function signToken(payload: Record<string, unknown>, issuer = "http://localhost:3000") {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuer(issuer)
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(getKey());
}

describe("verifyAccessToken issuer claim", () => {
    it("accepts a token with the expected issuer", async () => {
        const token = await signToken({ sub: "user-123", user_id: 123 });

        const result = await verifyAccessToken(token);

        expect(result.sub).toBe("user-123");
        expect(result.user_id).toBe(123);
    });

    it("rejects a token with the wrong issuer", async () => {
        const token = await signToken({ sub: "user-123" }, "attacker");

        await expect(verifyAccessToken(token)).rejects.toMatchObject({
            statusCode: 401,
            statusMessage: "invalid_token",
        });
    });

    it("rejects a token with no issuer", async () => {
        const token = await new SignJWT({ sub: "user-123" })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("1h")
            .sign(getKey());

        await expect(verifyAccessToken(token)).rejects.toMatchObject({
            statusCode: 401,
            statusMessage: "invalid_token",
        });
    });
});

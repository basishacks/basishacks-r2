import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    extractBearerToken,
    parseJWScopes,
    requireScopes,
    verifyAccessToken,
    withOAuth2JWT,
    resolveOAuth2User,
} from "~~/server/utils/oauth2-jwt";

// ---------------------------------------------------------------------------
// Global mocks for Nitro auto-imports
// ---------------------------------------------------------------------------

beforeEach(() => {
    (globalThis as any).createError = (input: any) => {
        const err = new Error(input.message || input.statusMessage || "Error");
        (err as any).statusCode = input.statusCode ?? input.status ?? 500;
        (err as any).statusMessage = input.statusMessage;
        return err;
    };
    (globalThis as any).getHeader = vi.fn();
});

// Mock jose
vi.mock("jose", () => ({
    jwtVerify: vi.fn(),
}));

// Mock database users helper
vi.mock("~~/server/utils/database/users", () => ({
    getUser: vi.fn(),
}));

import { jwtVerify } from "jose";
import { getUser } from "~~/server/utils/database/users";

function makeMockEvent(headers: Record<string, string> = {}) {
    return {
        path: "/api/test",
        method: "GET",
        headers,
        context: {},
    } as any;
}

// ---------------------------------------------------------------------------
// extractBearerToken
// ---------------------------------------------------------------------------

describe("extractBearerToken", () => {
    it("extracts the token from a valid Bearer authorization header", () => {
        (globalThis as any).getHeader = vi.fn().mockReturnValue("Bearer my-secret-token");

        const event = makeMockEvent();
        const token = extractBearerToken(event);

        expect(token).toBe("my-secret-token");
    });

    it('handles lowercase "bearer" prefix', () => {
        (globalThis as any).getHeader = vi.fn().mockReturnValue("bearer lowercase-token");

        const event = makeMockEvent();
        const token = extractBearerToken(event);

        expect(token).toBe("lowercase-token");
    });

    it('handles mixed-case "Bearer" prefix', () => {
        (globalThis as any).getHeader = vi.fn().mockReturnValue("BEARER uppercase-token");

        const event = makeMockEvent();
        const token = extractBearerToken(event);

        expect(token).toBe("uppercase-token");
    });

    it("trims whitespace from the extracted token", () => {
        (globalThis as any).getHeader = vi.fn().mockReturnValue("Bearer   padded-token   ");

        const event = makeMockEvent();
        const token = extractBearerToken(event);

        expect(token).toBe("padded-token");
    });

    it("throws 401 when the authorization header is missing", () => {
        (globalThis as any).getHeader = vi.fn().mockReturnValue(undefined);

        const event = makeMockEvent();

        expect(() => extractBearerToken(event)).toThrow();
        try {
            extractBearerToken(event);
        } catch (err: any) {
            expect(err.statusCode).toBe(401);
            expect(err.statusMessage).toBe("invalid_token");
            expect(err.message).toBe("Missing or invalid Authorization header");
        }
    });

    it("throws 401 when the header is malformed (no Bearer prefix)", () => {
        (globalThis as any).getHeader = vi.fn().mockReturnValue("Basic abc123");

        const event = makeMockEvent();

        try {
            extractBearerToken(event);
        } catch (err: any) {
            expect(err.statusCode).toBe(401);
            expect(err.statusMessage).toBe("invalid_token");
        }
    });

    it('throws 401 when the header has "Bearer" but no token (empty)', () => {
        (globalThis as any).getHeader = vi.fn().mockReturnValue("Bearer ");

        const event = makeMockEvent();

        try {
            extractBearerToken(event);
        } catch (err: any) {
            expect(err.statusCode).toBe(401);
            expect(err.message).toBe("Empty access token");
        }
    });

    it('throws 401 when the header is just "Bearer" with no space', () => {
        (globalThis as any).getHeader = vi.fn().mockReturnValue("Bearer");

        const event = makeMockEvent();

        try {
            extractBearerToken(event);
        } catch (err: any) {
            expect(err.statusCode).toBe(401);
            expect(err.message).toBe("Missing or invalid Authorization header");
        }
    });
});

// ---------------------------------------------------------------------------
// parseJWScopes
// ---------------------------------------------------------------------------

describe("parseJWScopes", () => {
    it("splits a space-separated scope string into an array", () => {
        const result = parseJWScopes("openid profile email");

        expect(result).toEqual(["openid", "profile", "email"]);
    });

    it("returns an empty array for an empty string", () => {
        const result = parseJWScopes("");

        expect(result).toEqual([]);
    });

    it("returns an empty array for null", () => {
        const result = parseJWScopes(null);

        expect(result).toEqual([]);
    });

    it("returns an empty array for undefined", () => {
        const result = parseJWScopes(undefined);

        expect(result).toEqual([]);
    });

    it("returns an empty array for non-string values", () => {
        const result = parseJWScopes(123);

        expect(result).toEqual([]);
    });

    it("returns an empty array for a boolean value", () => {
        const result = parseJWScopes(true);

        expect(result).toEqual([]);
    });

    it("filters out empty strings from multiple spaces", () => {
        const result = parseJWScopes("openid   profile  email");

        // "openid", "", "", "profile", "", "email" → filters empty
        expect(result).toEqual(["openid", "profile", "email"]);
    });

    it("handles leading and trailing spaces", () => {
        const result = parseJWScopes("  openid profile  ");

        expect(result).toEqual(["openid", "profile"]);
    });

    it("returns a single scope for a string with no spaces", () => {
        const result = parseJWScopes("openid");

        expect(result).toEqual(["openid"]);
    });
});

// ---------------------------------------------------------------------------
// requireScopes
// ---------------------------------------------------------------------------

describe("requireScopes", () => {
    it("does not throw when all required scopes are present", () => {
        expect(() => {
            requireScopes(["openid", "profile", "email"], ["openid", "profile"]);
        }).not.toThrow();
    });

    it("does not throw when required scopes are exactly the granted scopes", () => {
        expect(() => {
            requireScopes(["openid", "profile"], ["openid", "profile"]);
        }).not.toThrow();
    });

    it("throws 403 when some required scopes are missing", () => {
        try {
            requireScopes(["openid"], ["openid", "profile"]);
            // Should not reach here
            expect(true).toBe(false);
        } catch (err: any) {
            expect(err.statusCode).toBe(403);
            expect(err.statusMessage).toBe("insufficient_scope");
            expect(err.message).toContain("Missing required scope(s)");
            expect(err.message).toContain("profile");
        }
    });

    it("throws 403 when all required scopes are missing", () => {
        try {
            requireScopes(["openid"], ["profile", "email"]);
            expect(true).toBe(false);
        } catch (err: any) {
            expect(err.statusCode).toBe(403);
            expect(err.message).toContain("profile");
            expect(err.message).toContain("email");
        }
    });

    it("does not throw when required scopes array is empty", () => {
        expect(() => {
            requireScopes(["openid", "profile"], []);
        }).not.toThrow();
    });

    it("does not throw when granted scopes array is empty but required is also empty", () => {
        expect(() => {
            requireScopes([], []);
        }).not.toThrow();
    });

    it("throws 403 when granted scopes is empty but required is not", () => {
        try {
            requireScopes([], ["openid"]);
            expect(true).toBe(false);
        } catch (err: any) {
            expect(err.statusCode).toBe(403);
        }
    });
});

// ---------------------------------------------------------------------------
// verifyAccessToken
// ---------------------------------------------------------------------------

describe("verifyAccessToken", () => {
    beforeEach(() => {
        process.env.NUXT_OAUTH2_JWT_SECRET = "test-secret-key-at-least-32-bytes!!";
        vi.clearAllMocks();
    });

    it("throws 401 when token is empty", async () => {
        try {
            await verifyAccessToken("");
            expect(true).toBe(false);
        } catch (err: any) {
            expect(err.statusCode).toBe(401);
            expect(err.statusMessage).toBe("invalid_token");
            expect(err.message).toBe("Empty access token");
        }
    });

    it("returns the payload for a valid token", async () => {
        const mockPayload = { sub: "user-123", scope: "openid profile" };
        (jwtVerify as any).mockResolvedValue({ payload: mockPayload });

        const result = await verifyAccessToken("valid-token");

        expect(result).toEqual(mockPayload);
        expect(jwtVerify).toHaveBeenCalledTimes(1);
    });

    it("throws 401 when jwtVerify rejects (invalid or expired token)", async () => {
        (jwtVerify as any).mockRejectedValue(new Error("JWT expired"));

        try {
            await verifyAccessToken("expired-token");
            expect(true).toBe(false);
        } catch (err: any) {
            expect(err.statusCode).toBe(401);
            expect(err.statusMessage).toBe("invalid_token");
            expect(err.message).toBe("Invalid or expired access token");
        }
    });

    it("throws 401 for a malformed JWT", async () => {
        (jwtVerify as any).mockRejectedValue(new Error("Invalid JWT"));

        try {
            await verifyAccessToken("not.a.valid.jwt");
            expect(true).toBe(false);
        } catch (err: any) {
            expect(err.statusCode).toBe(401);
        }
    });

    it("throws 500 when NUXT_OAUTH2_JWT_SECRET is not set", async () => {
        const original = process.env.NUXT_OAUTH2_JWT_SECRET;
        delete (process.env as any).NUXT_OAUTH2_JWT_SECRET;
        expect(process.env.NUXT_OAUTH2_JWT_SECRET).toBeUndefined();

        await expect(verifyAccessToken("valid-token")).rejects.toMatchObject({
            statusCode: 500,
            message: "NUXT_OAUTH2_JWT_SECRET is not set",
        });

        if (original === undefined) {
            delete (process.env as any).NUXT_OAUTH2_JWT_SECRET;
        } else {
            process.env.NUXT_OAUTH2_JWT_SECRET = original;
        }
    });
});

// ---------------------------------------------------------------------------
// withOAuth2JWT
// ---------------------------------------------------------------------------

describe("withOAuth2JWT", () => {
    beforeEach(() => {
        process.env.NUXT_OAUTH2_JWT_SECRET = "test-secret-key-at-least-32-bytes!!";
        vi.clearAllMocks();
    });

    it("calls the handler with oauth2 context attached to the event", async () => {
        (globalThis as any).getHeader = vi.fn().mockReturnValue("Bearer valid-token");

        const mockPayload = { sub: "user-42", scope: "openid profile" };
        (jwtVerify as any).mockResolvedValue({ payload: mockPayload });

        const handler = vi.fn().mockResolvedValue({ data: "success" });
        const wrapped = withOAuth2JWT(handler);

        const event = makeMockEvent();
        const result = await wrapped(event);

        expect(result).toEqual({ data: "success" });
        expect(handler).toHaveBeenCalledTimes(1);
        expect(event.context.oauth2).toBeDefined();
        expect(event.context.oauth2.payload).toEqual(mockPayload);
        expect(event.context.oauth2.scopes).toEqual(["openid", "profile"]);
    });

    it("attaches only payload and scopes when loadUser is false (default)", async () => {
        (globalThis as any).getHeader = vi.fn().mockReturnValue("Bearer valid-token");

        const mockPayload = { sub: "user-42", scope: "openid" };
        (jwtVerify as any).mockResolvedValue({ payload: mockPayload });

        const handler = vi.fn().mockResolvedValue({ ok: true });
        const wrapped = withOAuth2JWT(handler);

        const event = makeMockEvent();
        await wrapped(event);

        expect(event.context.oauth2.payload).toEqual(mockPayload);
        expect(event.context.oauth2.scopes).toEqual(["openid"]);
        expect(event.context.oauth2.user).toBeUndefined();
    });

    it("throws 401 when the Bearer token is missing (wrapped handler)", async () => {
        (globalThis as any).getHeader = vi.fn().mockReturnValue(undefined);

        const handler = vi.fn();
        const wrapped = withOAuth2JWT(handler);

        const event = makeMockEvent();

        await expect(wrapped(event)).rejects.toMatchObject({
            statusCode: 401,
        });
        expect(handler).not.toHaveBeenCalled();
    });

    it("does not enforce scopes when requiredScopes is empty", async () => {
        (globalThis as any).getHeader = vi.fn().mockReturnValue("Bearer valid-token");

        const mockPayload = { sub: "user-42", scope: "openid" };
        (jwtVerify as any).mockResolvedValue({ payload: mockPayload });

        const handler = vi.fn().mockResolvedValue({ ok: true });
        const wrapped = withOAuth2JWT(handler, { requiredScopes: [] });

        const event = makeMockEvent();
        const result = await wrapped(event);

        expect(result).toEqual({ ok: true });
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it("throws 403 when required scopes are missing", async () => {
        (globalThis as any).getHeader = vi.fn().mockReturnValue("Bearer valid-token");

        const mockPayload = { sub: "user-42", scope: "openid" };
        (jwtVerify as any).mockResolvedValue({ payload: mockPayload });

        const handler = vi.fn();
        const wrapped = withOAuth2JWT(handler, { requiredScopes: ["profile"] });

        const event = makeMockEvent();

        await expect(wrapped(event)).rejects.toMatchObject({
            statusCode: 403,
            statusMessage: "insufficient_scope",
        });
        expect(handler).not.toHaveBeenCalled();
    });

    it("loads the DB user when loadUser is true", async () => {
        (globalThis as any).getHeader = vi.fn().mockReturnValue("Bearer valid-token");

        const mockUser = { id: 42, email: "user@example.com" };
        (jwtVerify as any).mockResolvedValue({
            payload: { sub: "user-42", user_id: 42, scope: "openid profile" },
        });
        (getUser as any).mockResolvedValue(mockUser);

        const handler = vi.fn().mockResolvedValue({ ok: true });
        const wrapped = withOAuth2JWT(handler, { loadUser: true });

        const event = makeMockEvent();
        await wrapped(event);

        expect(getUser).toHaveBeenCalledWith(event, 42);
        expect(event.context.oauth2.user).toEqual(mockUser);
    });
});

// ---------------------------------------------------------------------------
// resolveOAuth2User
// ---------------------------------------------------------------------------

describe("resolveOAuth2User", () => {
    beforeEach(() => {
        (getUser as any).mockReset();
    });

    it("throws 401 when the payload has no user identification", async () => {
        const event = makeMockEvent();

        await expect(resolveOAuth2User(event, {})).rejects.toMatchObject({
            statusCode: 401,
            statusMessage: "invalid_token",
            message: "Token missing user identification",
        });
    });

    it("throws 401 when the user_id is not a number", async () => {
        const event = makeMockEvent();

        await expect(
            resolveOAuth2User(event, { user_id: "not-a-number" as any }),
        ).rejects.toMatchObject({
            statusCode: 401,
            statusMessage: "invalid_token",
        });
    });

    it("throws 404 when the user does not exist", async () => {
        (getUser as any).mockResolvedValue(null);
        const event = makeMockEvent();

        await expect(resolveOAuth2User(event, { user_id: 42 })).rejects.toMatchObject({
            statusCode: 404,
            message: "User not found",
        });
    });

    it("returns the user row when found", async () => {
        const mockUser = { id: 42, email: "user@example.com" };
        (getUser as any).mockResolvedValue(mockUser);
        const event = makeMockEvent();

        const result = await resolveOAuth2User(event, { user_id: 42 });

        expect(result).toEqual(mockUser);
    });

    it("falls back to sub when user_id is missing", async () => {
        const mockUser = { id: 7, email: "sub@example.com" };
        (getUser as any).mockResolvedValue(mockUser);
        const event = makeMockEvent();

        const result = await resolveOAuth2User(event, { sub: "7" });

        expect(result).toEqual(mockUser);
        expect(getUser).toHaveBeenCalledWith(event, 7);
    });
});

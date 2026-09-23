import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const cookies = new Map<string, string>();
const setCookieMock = vi.fn((_event: unknown, name: string, value: string) => {
    cookies.set(name, value);
});
const deleteCookieMock = vi.fn((_event: unknown, name: string) => {
    cookies.delete(name);
});

let sessionUtils: typeof import("~~/server/utils/basis-auth-session");

beforeAll(async () => {
    vi.stubGlobal("getCookie", (_event: unknown, name: string) => cookies.get(name));
    vi.stubGlobal("setCookie", setCookieMock);
    vi.stubGlobal("deleteCookie", deleteCookieMock);
    vi.stubGlobal("createError", (input: any) => Object.assign(new Error(input.message), input));
    sessionUtils = await import("~~/server/utils/basis-auth-session");
});

beforeEach(() => {
    cookies.clear();
    vi.clearAllMocks();
    process.env.BASIS_AUTH_COOKIE_SECRET = "a-secure-cookie-secret-that-is-at-least-32-bytes";
});

const tokens = {
    accessToken: "access-token",
    accessTokenExpiresAt: Date.now() + 60_000,
    refreshToken: "refresh-token",
};

describe("basis-auth encrypted cookies", () => {
    it("stores and restores the complete token bundle in an HTTP-only cookie", () => {
        const event = { context: {} } as any;

        sessionUtils.establishBasisAuthUserSession(event, 7, tokens);

        expect(setCookieMock).toHaveBeenCalledWith(
            event,
            sessionUtils.BASIS_AUTH_TOKEN_COOKIE,
            expect.stringMatching(/^v1\./),
            expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }),
        );
        expect(cookies.get(sessionUtils.BASIS_AUTH_TOKEN_COOKIE)).not.toContain("access-token");
        expect(sessionUtils.readBasisAuthUserSession(event)).toEqual({ userId: 7, tokens });
    });

    it("rejects a tampered token cookie", () => {
        const event = { context: {} } as any;
        sessionUtils.establishBasisAuthUserSession(event, 7, tokens);
        cookies.set(
            sessionUtils.BASIS_AUTH_TOKEN_COOKIE,
            `${cookies.get(sessionUtils.BASIS_AUTH_TOKEN_COOKIE)}tampered`,
        );

        expect(sessionUtils.readBasisAuthUserSession(event)).toBeUndefined();
    });

    it("consumes the short-lived OAuth transaction cookie once", () => {
        const event = { context: {} } as any;
        const transaction = {
            state: "state",
            nonce: "nonce",
            codeVerifier: "verifier",
            startedAt: Date.now(),
            postLoginRedirect: "/teams",
        };

        sessionUtils.writeBasisAuthFlowTransaction(event, transaction);

        expect(sessionUtils.consumeBasisAuthFlowTransaction(event)).toEqual(transaction);
        expect(sessionUtils.consumeBasisAuthFlowTransaction(event)).toEqual({});
        expect(deleteCookieMock).toHaveBeenCalledWith(event, sessionUtils.BASIS_AUTH_FLOW_COOKIE, {
            path: "/",
        });
    });

    it("clears the token cookie", () => {
        const event = { context: {} } as any;
        sessionUtils.establishBasisAuthUserSession(event, 7, tokens);

        sessionUtils.clearBasisAuthUserSession(event);

        expect(sessionUtils.readBasisAuthUserSession(event)).toBeUndefined();
        expect(deleteCookieMock).toHaveBeenCalledWith(event, sessionUtils.BASIS_AUTH_TOKEN_COOKIE, {
            path: "/",
        });
    });
});

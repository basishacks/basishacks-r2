import { vi, describe, it, expect, beforeAll, afterEach, beforeEach } from "vitest";
import { createHash } from "crypto";
import type { AuthorizeSession } from "~~/server/api/oauth2/session.post";
import { validateOAuth2AuthorizationRequest } from "~~/server/utils/oauth2-validate";

vi.mock("~~/server/utils/oauth2-validate", () => ({
    validateOAuth2AuthorizationRequest: vi.fn(),
}));
vi.mock("~~/server/utils/rateLimit", () => ({
    applyRateLimit: (fn: any) => fn,
    AUTH_RATE_LIMIT_CONFIG: {},
}));

vi.stubGlobal("defineEventHandler", (fn: any) => fn);
vi.stubGlobal("readBody", vi.fn());
vi.stubGlobal("setCookie", vi.fn());
vi.stubGlobal("getCookie", vi.fn());
vi.stubGlobal("applyRateLimit", (fn: any) => fn);
vi.stubGlobal("createError", (err: any) => {
    const e = new Error(err.message || "Error") as any;
    e.statusCode = err.statusCode || err.status || 500;
    throw e;
});

let addAuthorizeSession: typeof import("~~/server/api/oauth2/session.post").addAuthorizeSession;
let completeAuthorizeSession: typeof import("~~/server/api/oauth2/session.post").completeAuthorizeSession;
let exchangeAuthorizationCode: typeof import("~~/server/api/oauth2/session.post").exchangeAuthorizationCode;
let generateExchangeCode: typeof import("~~/server/api/oauth2/session.post").generateExchangeCode;
let constructSession: typeof import("~~/server/api/oauth2/session.post").constructSession;
let removeIfSessionExpired: typeof import("~~/server/api/oauth2/session.post").removeIfSessionExpired;
let attachAuthorizeSessionCookie: typeof import("~~/server/api/oauth2/session.post").attachAuthorizeSessionCookie;
let getAuthorizeSession: typeof import("~~/server/api/oauth2/session.post").getAuthorizeSession;
let handler: any;

beforeAll(async () => {
    process.env.NUXT_OAUTH2_JWT_SECRET = "super-secret-key-at-least-32-bytes-long";

    const mod = await import("~~/server/api/oauth2/session.post");
    addAuthorizeSession = mod.addAuthorizeSession;
    completeAuthorizeSession = mod.completeAuthorizeSession;
    exchangeAuthorizationCode = mod.exchangeAuthorizationCode;
    generateExchangeCode = mod.generateExchangeCode;
    constructSession = mod.constructSession;
    removeIfSessionExpired = mod.removeIfSessionExpired;
    attachAuthorizeSessionCookie = mod.attachAuthorizeSessionCookie;
    getAuthorizeSession = mod.getAuthorizeSession;
    handler = mod.default;
});

beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).readBody.mockReset();
});

const createdTokens: string[] = [];

afterEach(() => {
    for (const token of createdTokens) {
        completeAuthorizeSession(token);
    }
    createdTokens.length = 0;
});

function createSession(overrides: Partial<AuthorizeSession> = {}): AuthorizeSession {
    const token = `test-token-${Math.random().toString(36).slice(2)}`;
    const session: AuthorizeSession = {
        token,
        ms_verifier: null,
        ms_state: null,
        redirect_uri: "https://example.com/callback",
        granted_time: Date.now(),
        expire_time: Date.now() + 10 * 60 * 1000,
        application: {
            client_id: "test-client",
            client_secret: "secret",
            name: "Test App",
            permissions: "",
            redirect_uris: "",
            proxy_microsoft: 0,
            type: "confidential",
        } as any,
        user: { id: 1 } as any,
        teams_code: null,
        bh_state: "state",
        bh_verifier_challenge: "",
        bh_verifier_challenge_method: "",
        scopes: ["openid"],
        login_state: "completed",
        code: null,
        ...overrides,
    };
    addAuthorizeSession(session);
    createdTokens.push(session.token);
    return session;
}

describe("addAuthorizeSession", () => {
    it("sweeps expired sessions on the first call and skips subsequent calls within the interval", () => {
        vi.useFakeTimers();
        const expiredSession = createSession({ expire_time: Date.now() - 1000 });
        const activeSession = createSession();

        vi.advanceTimersByTime(6 * 60 * 1000);
        addAuthorizeSession(activeSession);

        expect(getAuthorizeSession(expiredSession.token)).toBeNull();
        expect(getAuthorizeSession(activeSession.token)).not.toBeNull();

        vi.useRealTimers();
    });
});

describe("getAuthorizeSession", () => {
    it("returns null and deletes the session when it has expired", () => {
        const session = createSession({ expire_time: Date.now() - 1000 });

        const result = getAuthorizeSession(session.token);

        expect(result).toBeNull();
        expect(getAuthorizeSession(session.token)).toBeNull();
    });
});

describe("exchangeAuthorizationCode", () => {
    it("exchanges a valid code for a JWT", async () => {
        const session = createSession();
        generateExchangeCode(session);

        const jwt = await exchangeAuthorizationCode(session.code!);

        expect(typeof jwt).toBe("string");
        expect(jwt.length).toBeGreaterThan(0);
    });

    it("throws when NUXT_OAUTH2_JWT_SECRET is not set", async () => {
        const originalSecret = process.env.NUXT_OAUTH2_JWT_SECRET;
        delete process.env.NUXT_OAUTH2_JWT_SECRET;

        const session = createSession();
        generateExchangeCode(session);

        await expect(exchangeAuthorizationCode(session.code!)).rejects.toThrow(
            "NUXT_OAUTH2_JWT_SECRET is not set",
        );

        process.env.NUXT_OAUTH2_JWT_SECRET = originalSecret;
    });

    it("throws when no user is attached to the session", async () => {
        const session = createSession({ user: null });
        generateExchangeCode(session);

        await expect(exchangeAuthorizationCode(session.code!)).rejects.toThrow(
            "No user attached to session",
        );
    });

    it("invalidates the code before signing so concurrent exchanges yield one success", async () => {
        const session = createSession();
        generateExchangeCode(session);
        const code = session.code!;

        const results = await Promise.allSettled([
            exchangeAuthorizationCode(code),
            exchangeAuthorizationCode(code),
        ]);

        const successes = results.filter((r) => r.status === "fulfilled");
        const failures = results.filter((r) => r.status === "rejected");

        expect(successes).toHaveLength(1);
        expect(failures).toHaveLength(1);
    });

    it("rejects a previously used code", async () => {
        const session = createSession();
        generateExchangeCode(session);
        const code = session.code!;

        await exchangeAuthorizationCode(code);

        await expect(exchangeAuthorizationCode(code)).rejects.toThrow("Invalid authorization code");
    });

    it("continues searching when earlier sessions do not match the code", async () => {
        createSession();
        const matchingSession = createSession();
        generateExchangeCode(matchingSession);

        const jwt = await exchangeAuthorizationCode(matchingSession.code!);

        expect(typeof jwt).toBe("string");
        expect(jwt.length).toBeGreaterThan(0);
    });
});

describe("exchangeAuthorizationCode PKCE verification", () => {
    const verifier = "my-secret-pkce-verifier-value";

    function s256Challenge(v: string): string {
        return createHash("sha256").update(v).digest("base64url");
    }

    it("succeeds with correct code_verifier using S256", async () => {
        const session = createSession({
            bh_verifier_challenge: s256Challenge(verifier),
            bh_verifier_challenge_method: "S256",
        });
        generateExchangeCode(session);

        const jwt = await exchangeAuthorizationCode(
            session.code!,
            undefined,
            undefined,
            undefined,
            verifier,
        );

        expect(typeof jwt).toBe("string");
        expect(jwt.length).toBeGreaterThan(0);
    });

    it("rejects wrong code_verifier using S256", async () => {
        const session = createSession({
            bh_verifier_challenge: s256Challenge(verifier),
            bh_verifier_challenge_method: "S256",
        });
        generateExchangeCode(session);

        await expect(
            exchangeAuthorizationCode(
                session.code!,
                undefined,
                undefined,
                undefined,
                "wrong-verifier",
            ),
        ).rejects.toThrow("Invalid code_verifier");
    });

    it("rejects missing code_verifier when PKCE challenge is set", async () => {
        const session = createSession({
            bh_verifier_challenge: s256Challenge(verifier),
            bh_verifier_challenge_method: "S256",
        });
        generateExchangeCode(session);

        await expect(exchangeAuthorizationCode(session.code!)).rejects.toThrow(
            "code_verifier is required for PKCE",
        );
    });

    it("succeeds with correct code_verifier using plain method", async () => {
        const session = createSession({
            bh_verifier_challenge: verifier,
            bh_verifier_challenge_method: "plain",
        });
        generateExchangeCode(session);

        const jwt = await exchangeAuthorizationCode(
            session.code!,
            undefined,
            undefined,
            undefined,
            verifier,
        );

        expect(typeof jwt).toBe("string");
        expect(jwt.length).toBeGreaterThan(0);
    });

    it("rejects wrong code_verifier using plain method", async () => {
        const session = createSession({
            bh_verifier_challenge: verifier,
            bh_verifier_challenge_method: "plain",
        });
        generateExchangeCode(session);

        await expect(
            exchangeAuthorizationCode(
                session.code!,
                undefined,
                undefined,
                undefined,
                "wrong-verifier",
            ),
        ).rejects.toThrow("Invalid code_verifier");
    });

    it("skips PKCE check when no challenge was stored (non-PKCE flow)", async () => {
        const session = createSession({
            bh_verifier_challenge: "",
            bh_verifier_challenge_method: "",
        });
        generateExchangeCode(session);

        const jwt = await exchangeAuthorizationCode(session.code!);

        expect(typeof jwt).toBe("string");
        expect(jwt.length).toBeGreaterThan(0);
    });

    it("still invalidates the code synchronously even with PKCE mismatch", async () => {
        const session = createSession({
            bh_verifier_challenge: s256Challenge(verifier),
            bh_verifier_challenge_method: "S256",
        });
        generateExchangeCode(session);
        const code = session.code!;

        await expect(
            exchangeAuthorizationCode(code, undefined, undefined, undefined, "wrong"),
        ).rejects.toThrow();

        // Code must already be invalidated — a second attempt should not succeed
        await expect(
            exchangeAuthorizationCode(code, undefined, undefined, undefined, verifier),
        ).rejects.toThrow("Invalid authorization code");
    });

    it("rejects a code when the client_id does not match", async () => {
        const session = createSession();
        generateExchangeCode(session);

        await expect(exchangeAuthorizationCode(session.code!, "wrong-client-id")).rejects.toThrow(
            "client_id mismatch",
        );
    });

    it("rejects a code when the redirect_uri does not match", async () => {
        const session = createSession();
        generateExchangeCode(session);

        await expect(
            exchangeAuthorizationCode(session.code!, undefined, "https://evil.com/callback"),
        ).rejects.toThrow("redirect_uri mismatch");
    });

    it("rejects an expired code", async () => {
        const session = createSession({ expire_time: Date.now() - 1000 });
        generateExchangeCode(session);

        await expect(exchangeAuthorizationCode(session.code!)).rejects.toThrow(
            "Authorization code has expired",
        );
    });
});

describe("constructSession", () => {
    it("creates a session with the provided parameters", () => {
        const app = {
            client_id: "test-client",
            client_secret: "secret",
            name: "Test App",
            permissions: "openid profile",
            redirect_uris: "https://example.com/callback",
            proxy_microsoft: 0,
            type: "confidential",
        } as any;

        const session = constructSession(
            "https://example.com/callback",
            app,
            "state-value",
            "challenge",
            "S256",
            "openid%20profile",
            "/post-login",
        );

        expect(session.token).toBeTruthy();
        expect(session.redirect_uri).toBe("https://example.com/callback");
        expect(session.application).toBe(app);
        expect(session.bh_state).toBe("state-value");
        expect(session.bh_verifier_challenge).toBe("challenge");
        expect(session.bh_verifier_challenge_method).toBe("S256");
        expect(session.scopes).toEqual(["openid", "profile"]);
        expect(session.post_login_redirect).toBe("/post-login");
        expect(session.login_state).toBe("identification");
        expect(session.code).toBeNull();
        expect(session.expire_time).toBeGreaterThan(session.granted_time);
    });

    it("defaults post_login_redirect to null", () => {
        const session = constructSession(
            "https://example.com/callback",
            { client_id: "test-client" } as any,
            "state",
            "challenge",
            "S256",
            "openid",
        );

        expect(session.post_login_redirect).toBeNull();
    });
});

describe("removeIfSessionExpired", () => {
    it("removes the session and returns true when expired", () => {
        const session = createSession({ expire_time: Date.now() - 1000 });

        expect(removeIfSessionExpired(session)).toBe(true);
        expect(completeAuthorizeSession(session.token)).toBeUndefined();
    });

    it("returns false when the session is still valid", () => {
        const session = createSession();

        expect(removeIfSessionExpired(session)).toBe(false);
    });
});

describe("attachAuthorizeSessionCookie", () => {
    it("sets the bridge_id cookie with secure, httpOnly, lax settings", () => {
        const setCookieMock = (globalThis as any).setCookie as ReturnType<typeof vi.fn>;
        const session = createSession();

        attachAuthorizeSessionCookie(session, { context: {} });

        expect(setCookieMock).toHaveBeenCalledTimes(1);
        expect(setCookieMock).toHaveBeenCalledWith(
            expect.anything(),
            "bridge_id",
            session.token,
            expect.objectContaining({
                maxAge: 10 * 60,
                httpOnly: true,
                secure: true,
                sameSite: "lax",
            }),
        );
    });
});

describe("POST /api/oauth2/session", () => {
    beforeEach(() => {
        vi.mocked(validateOAuth2AuthorizationRequest).mockReset();
    });

    it("creates an authorize session and returns app info", async () => {
        const app = {
            client_id: "test-client",
            name: "Test App",
            description: "A test app",
            type: "confidential",
        };

        validateOAuth2AuthorizationRequest.mockResolvedValue({ app });
        (globalThis as any).readBody.mockResolvedValue({
            client_id: "test-client",
            scope: "openid profile",
            redirect_uri: "https://example.com/callback",
            state: "state-value",
            response_type: "code",
            code_challenge: "challenge",
            code_challenge_method: "S256",
            post_login_redirect: "/dashboard",
        });

        const result = await handler({ context: {} });

        expect(validateOAuth2AuthorizationRequest).toHaveBeenCalledWith(
            expect.anything(),
            "test-client",
            "openid profile",
            "https://example.com/callback",
            "state-value",
            "code",
            "challenge",
            "S256",
        );
        expect(result).toMatchObject({
            client_id: app.client_id,
            name: app.name,
            description: app.description,
            type: app.type,
        });
        expect(result.session).toBeTruthy();
        expect((globalThis as any).setCookie).toHaveBeenCalled();
    });

    it("defaults post_login_redirect to null when omitted", async () => {
        const app = {
            client_id: "test-client",
            name: "Test App",
            description: "A test app",
            type: "confidential",
        };

        validateOAuth2AuthorizationRequest.mockResolvedValue({ app });
        (globalThis as any).readBody.mockResolvedValue({
            client_id: "test-client",
            scope: "openid",
            redirect_uri: "https://example.com/callback",
            state: "state-value",
            response_type: "code",
            code_challenge: "challenge",
            code_challenge_method: "S256",
        });

        const result = await handler({ context: {} });

        expect(result).toMatchObject({
            client_id: app.client_id,
            name: app.name,
        });
        expect(result.session).toBeTruthy();
    });

    it("propagates validation errors with the original status code", async () => {
        validateOAuth2AuthorizationRequest.mockRejectedValue({
            statusCode: 403,
            message: "Invalid redirect_uri",
        });
        (globalThis as any).readBody.mockResolvedValue({
            client_id: "test-client",
            scope: "openid",
            redirect_uri: "https://evil.com",
            state: "state",
            response_type: "code",
            code_challenge: "challenge",
            code_challenge_method: "S256",
        });

        await expect(handler({ context: {} })).rejects.toMatchObject({
            statusCode: 403,
            message: "Invalid redirect_uri",
        });
    });

    it("defaults to status 500 and a generic message for errors without details", async () => {
        (globalThis as any).readBody.mockResolvedValue({
            client_id: "test-client",
            scope: "openid",
            redirect_uri: "https://example.com/callback",
            state: "state",
            response_type: "code",
            code_challenge: "challenge",
            code_challenge_method: "S256",
        });
        validateOAuth2AuthorizationRequest.mockRejectedValue({});

        await expect(handler({ context: {} })).rejects.toMatchObject({
            statusCode: 500,
            message: "An error occurred while validating the application",
        });
    });

    it("preserves a custom status code when the error has no message", async () => {
        (globalThis as any).readBody.mockResolvedValue({
            client_id: "test-client",
            scope: "openid",
            redirect_uri: "https://example.com/callback",
            state: "state",
            response_type: "code",
            code_challenge: "challenge",
            code_challenge_method: "S256",
        });
        validateOAuth2AuthorizationRequest.mockRejectedValue({ statusCode: 503 });

        await expect(handler({ context: {} })).rejects.toMatchObject({
            statusCode: 503,
            message: "An error occurred while validating the application",
        });
    });
});

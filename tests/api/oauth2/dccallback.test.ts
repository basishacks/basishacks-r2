import { vi, describe, it, expect, beforeAll, beforeEach } from "vitest";
import { resetMockState, setupNitroGlobals, mockCookies, mockQueryState } from "../helpers";

vi.mock("~~/server/api/oauth2/session.post", () => ({
    getAuthorizeSession: vi.fn(),
}));

vi.mock("~~/server/utils/oauth2-token", () => ({
    redeemAuthorizationCodeForToken: vi.fn(),
}));

vi.mock("~~/server/utils/oauth2-userinfo", () => ({
    resolveUserInfoFromAccessToken: vi.fn(),
}));

let deleteCookieSpy: ReturnType<typeof vi.fn>;
let sendRedirectSpy: ReturnType<typeof vi.fn>;
let setUserSessionSpy: ReturnType<typeof vi.fn>;

let handler: any;
let getAuthorizeSession: ReturnType<typeof vi.fn>;
let redeemAuthorizationCodeForToken: ReturnType<typeof vi.fn>;
let resolveUserInfoFromAccessToken: ReturnType<typeof vi.fn>;

beforeAll(async () => {
    setupNitroGlobals();

    deleteCookieSpy = vi.fn();
    sendRedirectSpy = vi.fn().mockResolvedValue(undefined);
    setUserSessionSpy = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("deleteCookie", deleteCookieSpy);
    vi.stubGlobal("sendRedirect", sendRedirectSpy);
    vi.stubGlobal("setUserSession", setUserSessionSpy);

    process.env.NUXT_OAUTH2_JWT_SECRET = "test-secret-at-least-32-bytes-long";

    handler = (await import("~~/server/api/oauth2/dccallback.get")).default;
    const sessionMod = await import("~~/server/api/oauth2/session.post");
    getAuthorizeSession = sessionMod.getAuthorizeSession as any;
    const tokenMod = await import("~~/server/utils/oauth2-token");
    redeemAuthorizationCodeForToken = tokenMod.redeemAuthorizationCodeForToken as any;
    const userinfoMod = await import("~~/server/utils/oauth2-userinfo");
    resolveUserInfoFromAccessToken = userinfoMod.resolveUserInfoFromAccessToken as any;
});

beforeEach(() => {
    resetMockState();
    deleteCookieSpy.mockClear();
    sendRedirectSpy.mockClear();
    setUserSessionSpy.mockClear();
    getAuthorizeSession.mockReset();
    redeemAuthorizationCodeForToken.mockReset();
    resolveUserInfoFromAccessToken.mockReset();
});

const VERIFIER = "verifier-from-cookie";
const MS_VERIFIER = "verifier-for-microsoft-flow";

function createMockSession() {
    return {
        token: "test-bridge-id",
        // ms_verifier is the Microsoft-flow PKCE verifier. The old buggy code
        // passed this as the code_verifier; the fix must NOT use it.
        ms_verifier: MS_VERIFIER,
        ms_state: null,
        redirect_uri: "https://example.com/callback",
        granted_time: Date.now(),
        expire_time: Date.now() + 10 * 60 * 1000,
        application: { client_id: "test-client-id" },
        user: { id: 42 },
        teams_code: null,
        bh_state: "test-state",
        bh_verifier_challenge: "",
        bh_verifier_challenge_method: "",
        scopes: ["openid", "profile"],
        post_login_redirect: null,
        login_state: "completed",
        code: null,
    };
}

function createEvent() {
    return { context: {}, node: { req: {}, res: {} } } as any;
}

describe("GET /api/oauth2/dccallback - PKCE verifier handling", () => {
    it("throws 400 when pkce_verifier cookie is missing", async () => {
        getAuthorizeSession.mockReturnValue(createMockSession());
        mockCookies.values["bridge_id"] = "test-bridge-id";
        mockQueryState.value = { code: "test-code", state: "test-state" };

        await expect(handler(createEvent())).rejects.toMatchObject({
            statusCode: 400,
            message: expect.stringContaining("Missing PKCE verifier cookie"),
        });

        expect(redeemAuthorizationCodeForToken).not.toHaveBeenCalled();
        expect(deleteCookieSpy).not.toHaveBeenCalled();
    });

    it("passes the pkce_verifier cookie value (not session.ms_verifier) to token redeem", async () => {
        getAuthorizeSession.mockReturnValue(createMockSession());
        mockCookies.values["bridge_id"] = "test-bridge-id";
        mockCookies.values["pkce_verifier"] = VERIFIER;
        mockQueryState.value = { code: "test-code", state: "test-state" };

        redeemAuthorizationCodeForToken.mockResolvedValue({
            access_token: "fake-jwt-token",
            token_type: "Bearer",
            expires_in: 3600,
        });
        resolveUserInfoFromAccessToken.mockResolvedValue({ sub: "42" });

        await handler(createEvent());

        expect(redeemAuthorizationCodeForToken).toHaveBeenCalledTimes(1);
        expect(redeemAuthorizationCodeForToken).toHaveBeenCalledWith({
            code: "test-code",
            clientId: "test-client-id",
            redirectUri: "https://example.com/callback",
            appPermissions: expect.any(String),
            codeVerifier: VERIFIER,
        });
    });

    it("resolves identity via resolveUserInfoFromAccessToken and sets session from sub", async () => {
        getAuthorizeSession.mockReturnValue(createMockSession());
        mockCookies.values["bridge_id"] = "test-bridge-id";
        mockCookies.values["pkce_verifier"] = VERIFIER;
        mockQueryState.value = { code: "test-code", state: "test-state" };

        redeemAuthorizationCodeForToken.mockResolvedValue({
            access_token: "fake-jwt-token",
            token_type: "Bearer",
            expires_in: 3600,
        });
        resolveUserInfoFromAccessToken.mockResolvedValue({ sub: "42" });

        await handler(createEvent());

        expect(resolveUserInfoFromAccessToken).toHaveBeenCalledWith(
            expect.anything(),
            "fake-jwt-token",
        );
        expect(setUserSessionSpy).toHaveBeenCalledWith(expect.anything(), {
            user: { id: 42 },
        });
    });

    it("clears the pkce_verifier cookie after a successful exchange", async () => {
        getAuthorizeSession.mockReturnValue(createMockSession());
        mockCookies.values["bridge_id"] = "test-bridge-id";
        mockCookies.values["pkce_verifier"] = VERIFIER;
        mockQueryState.value = { code: "test-code", state: "test-state" };

        redeemAuthorizationCodeForToken.mockResolvedValue({
            access_token: "fake-jwt-token",
            token_type: "Bearer",
            expires_in: 3600,
        });
        resolveUserInfoFromAccessToken.mockResolvedValue({ sub: "42" });

        await handler(createEvent());

        expect(deleteCookieSpy).toHaveBeenCalledWith(expect.anything(), "pkce_verifier");
    });

    it("clears the bridge_id session cookie after a successful exchange", async () => {
        getAuthorizeSession.mockReturnValue(createMockSession());
        mockCookies.values["bridge_id"] = "test-bridge-id";
        mockCookies.values["pkce_verifier"] = VERIFIER;
        mockQueryState.value = { code: "test-code", state: "test-state" };

        redeemAuthorizationCodeForToken.mockResolvedValue({
            access_token: "fake-jwt-token",
            token_type: "Bearer",
            expires_in: 3600,
        });
        resolveUserInfoFromAccessToken.mockResolvedValue({ sub: "42" });

        await handler(createEvent());

        expect(deleteCookieSpy).toHaveBeenCalledWith(expect.anything(), "bridge_id");
    });

    it("does not clear the pkce_verifier cookie when the exchange fails", async () => {
        getAuthorizeSession.mockReturnValue(createMockSession());
        mockCookies.values["bridge_id"] = "test-bridge-id";
        mockCookies.values["pkce_verifier"] = VERIFIER;
        mockQueryState.value = { code: "test-code", state: "test-state" };

        redeemAuthorizationCodeForToken.mockRejectedValue(new Error("Invalid code_verifier"));

        await expect(handler(createEvent())).rejects.toBeDefined();

        expect(deleteCookieSpy).not.toHaveBeenCalled();
        expect(resolveUserInfoFromAccessToken).not.toHaveBeenCalled();
    });

    it("uses session.post_login_redirect when present", async () => {
        getAuthorizeSession.mockReturnValue({
            ...createMockSession(),
            post_login_redirect: "/teams",
        });
        mockCookies.values["bridge_id"] = "test-bridge-id";
        mockCookies.values["pkce_verifier"] = VERIFIER;
        mockQueryState.value = { code: "test-code", state: "test-state" };

        redeemAuthorizationCodeForToken.mockResolvedValue({
            access_token: "fake-jwt-token",
            token_type: "Bearer",
            expires_in: 3600,
        });
        resolveUserInfoFromAccessToken.mockResolvedValue({ sub: "42" });

        await handler(createEvent());

        expect(sendRedirectSpy).toHaveBeenCalledWith(expect.anything(), "/teams", 302);
    });
});

describe("GET /api/oauth2/dccallback - error and validation paths", () => {
    it("redirects to home when the upstream OAuth2 returns an error", async () => {
        getAuthorizeSession.mockReturnValue(createMockSession());
        mockCookies.values["bridge_id"] = "test-bridge-id";
        mockQueryState.value = {
            error: "access_denied",
            error_description: "User denied access",
            state: "test-state",
        };

        await handler(createEvent());

        expect(sendRedirectSpy).toHaveBeenCalledTimes(1);
        expect(sendRedirectSpy).toHaveBeenCalledWith(expect.anything(), "/", 302);
        expect(redeemAuthorizationCodeForToken).not.toHaveBeenCalled();
    });

    it("throws 400 when the bridge_id cookie is missing", async () => {
        mockQueryState.value = { code: "test-code", state: "test-state" };
        // bridge_id cookie is intentionally not set

        await expect(handler(createEvent())).rejects.toMatchObject({
            statusCode: 400,
            message: "Missing bridge_id cookie",
        });

        expect(redeemAuthorizationCodeForToken).not.toHaveBeenCalled();
    });

    it("throws 400 when the authorize session is not found", async () => {
        getAuthorizeSession.mockReturnValue(null);
        mockCookies.values["bridge_id"] = "test-bridge-id";
        mockQueryState.value = { code: "test-code", state: "test-state" };

        await expect(handler(createEvent())).rejects.toMatchObject({
            statusCode: 400,
            message: "Authorize session not found or expired",
        });

        expect(redeemAuthorizationCodeForToken).not.toHaveBeenCalled();
    });

    it("throws 400 when the state parameter is missing", async () => {
        getAuthorizeSession.mockReturnValue(createMockSession());
        mockCookies.values["bridge_id"] = "test-bridge-id";
        mockCookies.values["pkce_verifier"] = VERIFIER;
        mockQueryState.value = { code: "test-code" };

        await expect(handler(createEvent())).rejects.toMatchObject({
            statusCode: 400,
            message: "State parameter mismatch",
        });

        expect(redeemAuthorizationCodeForToken).not.toHaveBeenCalled();
    });

    it("throws 400 when the state parameter does not match the session", async () => {
        getAuthorizeSession.mockReturnValue(createMockSession());
        mockCookies.values["bridge_id"] = "test-bridge-id";
        mockCookies.values["pkce_verifier"] = VERIFIER;
        mockQueryState.value = { code: "test-code", state: "wrong-state" };

        await expect(handler(createEvent())).rejects.toMatchObject({
            statusCode: 400,
            message: "State parameter mismatch",
        });

        expect(redeemAuthorizationCodeForToken).not.toHaveBeenCalled();
    });

    it("redirects to /dashboard when given an absolute URL (blocks open redirect)", async () => {
        getAuthorizeSession.mockReturnValue(createMockSession());
        mockCookies.values["bridge_id"] = "test-bridge-id";
        mockCookies.values["pkce_verifier"] = VERIFIER;
        mockQueryState.value = {
            code: "test-code",
            state: "test-state",
            redirect: "https://evil.com/phish",
        };
        redeemAuthorizationCodeForToken.mockResolvedValue({
            access_token: "fake-jwt-token",
            token_type: "Bearer",
            expires_in: 3600,
        });
        resolveUserInfoFromAccessToken.mockResolvedValue({ sub: "42" });

        await handler(createEvent());

        expect(sendRedirectSpy).toHaveBeenCalledWith(expect.anything(), "/dashboard", 302);
    });

    it("redirects to /dashboard when given a protocol-relative URL (blocks open redirect)", async () => {
        getAuthorizeSession.mockReturnValue(createMockSession());
        mockCookies.values["bridge_id"] = "test-bridge-id";
        mockCookies.values["pkce_verifier"] = VERIFIER;
        mockQueryState.value = {
            code: "test-code",
            state: "test-state",
            redirect: "//evil.com/phish",
        };
        redeemAuthorizationCodeForToken.mockResolvedValue({
            access_token: "fake-jwt-token",
            token_type: "Bearer",
            expires_in: 3600,
        });
        resolveUserInfoFromAccessToken.mockResolvedValue({ sub: "42" });

        await handler(createEvent());

        expect(sendRedirectSpy).toHaveBeenCalledWith(expect.anything(), "/dashboard", 302);
    });

    it("redirects to the given relative path when redirect is safe", async () => {
        getAuthorizeSession.mockReturnValue(createMockSession());
        mockCookies.values["bridge_id"] = "test-bridge-id";
        mockCookies.values["pkce_verifier"] = VERIFIER;
        mockQueryState.value = {
            code: "test-code",
            state: "test-state",
            redirect: "/results",
        };
        redeemAuthorizationCodeForToken.mockResolvedValue({
            access_token: "fake-jwt-token",
            token_type: "Bearer",
            expires_in: 3600,
        });
        resolveUserInfoFromAccessToken.mockResolvedValue({ sub: "42" });

        await handler(createEvent());

        expect(sendRedirectSpy).toHaveBeenCalledWith(expect.anything(), "/results", 302);
    });
});

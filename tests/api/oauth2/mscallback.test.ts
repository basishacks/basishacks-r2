import { vi, describe, it, expect, beforeAll, beforeEach } from "vitest";
import { resetMockState, setupNitroGlobals, mockCookies, mockQueryState } from "../helpers";

// Mock the session.post module so we can control getAuthorizeSession in isolation.
// generateExchangeCode is invoked by determinePostMicrosoft on a successful flow,
// so we provide a deterministic implementation for the redirect URL assertion.
vi.mock("~~/server/api/oauth2/session.post", () => ({
    getAuthorizeSession: vi.fn(),
    generateExchangeCode: (session: any) => {
        session.code = "test-exchange-code";
    },
}));

// Mock the user helper so we can verify it is called without needing a real database.
vi.mock("~~/server/utils/database/users", () => ({
    createUserFromMicrosoftProfile: vi.fn(),
}));

let sendRedirectSpy: ReturnType<typeof vi.fn>;
let fetchSpy: ReturnType<typeof vi.fn>;

let handler: any;
let getAuthorizeSession: ReturnType<typeof vi.fn>;
let createUserFromMicrosoftProfile: ReturnType<typeof vi.fn>;

const MS_VERIFIER = "verifier-for-microsoft-flow";
const MS_STATE = "microsoft-state-value";
const BH_STATE = "basishacks-state-value";

function createAccessToken(payload: Record<string, unknown>) {
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `header.${encoded}.signature`;
}

function createMockSession(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        token: "test-bridge-id",
        ms_verifier: MS_VERIFIER,
        ms_state: MS_STATE,
        redirect_uri: "https://example.com/callback",
        granted_time: Date.now(),
        expire_time: Date.now() + 10 * 60 * 1000,
        application: { client_id: "test-client-id" },
        user: null,
        teams_code: null,
        bh_state: BH_STATE,
        bh_verifier_challenge: "challenge",
        bh_verifier_challenge_method: "S256",
        scopes: ["openid", "profile"],
        post_login_redirect: null,
        login_state: "requesting",
        code: null,
        ...overrides,
    };
}

function createEvent() {
    return { context: {}, node: { req: {}, res: {} } } as any;
}

beforeAll(async () => {
    setupNitroGlobals();

    sendRedirectSpy = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("sendRedirect", sendRedirectSpy);

    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    process.env.MICROSOFT_CLIENT_SECRET = "test-microsoft-client-secret";
    process.env.MICROSOFT_TENANT_ID = "test-tenant";
    process.env.MICROSOFT_CLIENT_ID = "test-microsoft-client-id";

    handler = (await import("~~/server/api/oauth2/mscallback.get")).default;
    const sessionMod = await import("~~/server/api/oauth2/session.post");
    getAuthorizeSession = sessionMod.getAuthorizeSession as any;
    const userMod = await import("~~/server/utils/database/users");
    createUserFromMicrosoftProfile = userMod.createUserFromMicrosoftProfile as any;
});

beforeEach(() => {
    resetMockState();
    sendRedirectSpy.mockClear();
    fetchSpy.mockClear();
    getAuthorizeSession.mockReset();
    createUserFromMicrosoftProfile.mockReset();
});

describe("GET /api/oauth2/mscallback - hardened callback", () => {
    it("redirects with an error when the bridge_id cookie is missing", async () => {
        mockQueryState.value = { code: "test-code", state: MS_STATE };
        // bridge_id cookie is intentionally not set

        await handler(createEvent());

        expect(sendRedirectSpy).toHaveBeenCalledTimes(1);
        const redirectUrl = sendRedirectSpy.mock.calls[0][1];
        expect(redirectUrl).toContain("error=invalid_request");
        expect(redirectUrl).toContain("Your+login+session+does+not+exist+or+has+expired");
        expect(fetchSpy).not.toHaveBeenCalled();
        expect(createUserFromMicrosoftProfile).not.toHaveBeenCalled();
    });

    it("redirects with an error when the authorize session is missing", async () => {
        getAuthorizeSession.mockReturnValue(null);
        mockCookies.values["bridge_id"] = "test-bridge-id";
        mockQueryState.value = { code: "test-code", state: MS_STATE };

        await handler(createEvent());

        expect(sendRedirectSpy).toHaveBeenCalledTimes(1);
        const redirectUrl = sendRedirectSpy.mock.calls[0][1];
        expect(redirectUrl).toContain("error=invalid_request");
        expect(redirectUrl).toContain("Your+login+session+does+not+exist+or+has+expired");
        expect(fetchSpy).not.toHaveBeenCalled();
        expect(createUserFromMicrosoftProfile).not.toHaveBeenCalled();
    });

    it("redirects with access_denied when MICROSOFT_CLIENT_SECRET is not set", async () => {
        const originalSecret = process.env.MICROSOFT_CLIENT_SECRET;
        delete process.env.MICROSOFT_CLIENT_SECRET;

        getAuthorizeSession.mockReturnValue(createMockSession());
        mockCookies.values["bridge_id"] = "test-bridge-id";
        mockQueryState.value = { code: "test-code", state: MS_STATE };

        await handler(createEvent());

        expect(sendRedirectSpy).toHaveBeenCalledTimes(1);
        const redirectUrl = sendRedirectSpy.mock.calls[0][1];
        expect(redirectUrl).toContain("error=access_denied");
        expect(redirectUrl).toContain("MICROSOFT_CLIENT_SECRET");
        expect(fetchSpy).not.toHaveBeenCalled();

        process.env.MICROSOFT_CLIENT_SECRET = originalSecret;
    });

    it("redirects with access_denied when Microsoft returns a non-ok token response", async () => {
        getAuthorizeSession.mockReturnValue(createMockSession());
        fetchSpy.mockResolvedValue({
            ok: false,
            json: () => Promise.resolve({ error: "invalid_grant", error_description: "Bad code" }),
        });

        mockCookies.values["bridge_id"] = "test-bridge-id";
        mockQueryState.value = { code: "test-code", state: MS_STATE };

        await handler(createEvent());

        expect(sendRedirectSpy).toHaveBeenCalledTimes(1);
        const redirectUrl = sendRedirectSpy.mock.calls[0][1];
        expect(redirectUrl).toContain("error=access_denied");
        expect(redirectUrl).toContain("Bad+code");
    });

    it("uses a default description when the non-ok token response omits one", async () => {
        getAuthorizeSession.mockReturnValue(createMockSession());
        fetchSpy.mockResolvedValue({
            ok: false,
            json: () => Promise.resolve({ error: "invalid_grant" }),
        });

        mockCookies.values["bridge_id"] = "test-bridge-id";
        mockQueryState.value = { code: "test-code", state: MS_STATE };

        await handler(createEvent());

        const redirectUrl = sendRedirectSpy.mock.calls[0][1];
        expect(redirectUrl).toContain("error=access_denied");
        expect(redirectUrl).toContain("Unknown+error");
    });

    it("stringifies non-Error exceptions during the token exchange", async () => {
        getAuthorizeSession.mockReturnValue(createMockSession());
        fetchSpy.mockRejectedValue("plain string failure");

        mockCookies.values["bridge_id"] = "test-bridge-id";
        mockQueryState.value = { code: "test-code", state: MS_STATE };

        await handler(createEvent());

        const redirectUrl = sendRedirectSpy.mock.calls[0][1];
        expect(redirectUrl).toContain("error=access_denied");
        expect(redirectUrl).toContain("plain+string+failure");
    });

    it("redirects with invalid_request when the state query parameter does not match the session", async () => {
        getAuthorizeSession.mockReturnValue(createMockSession());
        mockCookies.values["bridge_id"] = "test-bridge-id";
        mockQueryState.value = { code: "test-code", state: "wrong-state" };

        await handler(createEvent());

        expect(sendRedirectSpy).toHaveBeenCalledTimes(1);
        const redirectUrl = sendRedirectSpy.mock.calls[0][1];
        expect(redirectUrl).toContain("error=invalid_request");
        expect(redirectUrl).toContain("Invalid+or+missing+OAuth2+state");
        expect(redirectUrl).toContain(`state=${BH_STATE}`);
        expect(fetchSpy).not.toHaveBeenCalled();
        expect(createUserFromMicrosoftProfile).not.toHaveBeenCalled();
    });

    it("redirects with invalid_request when the state query parameter is missing", async () => {
        getAuthorizeSession.mockReturnValue(createMockSession());
        mockCookies.values["bridge_id"] = "test-bridge-id";
        mockQueryState.value = { code: "test-code" };

        await handler(createEvent());

        expect(sendRedirectSpy).toHaveBeenCalledTimes(1);
        const redirectUrl = sendRedirectSpy.mock.calls[0][1];
        expect(redirectUrl).toContain("error=invalid_request");
        expect(redirectUrl).toContain("Invalid+or+missing+OAuth2+state");
        expect(fetchSpy).not.toHaveBeenCalled();
        expect(createUserFromMicrosoftProfile).not.toHaveBeenCalled();
    });

    it("redirects with invalid_request and does not call Microsoft when ms_verifier is empty", async () => {
        getAuthorizeSession.mockReturnValue(createMockSession({ ms_verifier: "" }));
        mockCookies.values["bridge_id"] = "test-bridge-id";
        mockQueryState.value = { code: "test-code", state: MS_STATE };

        await handler(createEvent());

        expect(sendRedirectSpy).toHaveBeenCalledTimes(1);
        const redirectUrl = sendRedirectSpy.mock.calls[0][1];
        expect(redirectUrl).toContain("error=invalid_request");
        expect(redirectUrl).toContain("Missing+PKCE+code+verifier");
        expect(fetchSpy).not.toHaveBeenCalled();
        expect(createUserFromMicrosoftProfile).not.toHaveBeenCalled();
    });

    it("redirects with invalid_request when the authorization code is missing", async () => {
        getAuthorizeSession.mockReturnValue(createMockSession());
        mockCookies.values["bridge_id"] = "test-bridge-id";
        mockQueryState.value = { state: MS_STATE };

        await handler(createEvent());

        expect(sendRedirectSpy).toHaveBeenCalledTimes(1);
        const redirectUrl = sendRedirectSpy.mock.calls[0][1];
        expect(redirectUrl).toContain("error=invalid_request");
        expect(redirectUrl).toContain("No+valid+Microsoft+OAuth2+code+provided");
        expect(fetchSpy).not.toHaveBeenCalled();
        expect(createUserFromMicrosoftProfile).not.toHaveBeenCalled();
    });

    it("redirects with access_denied when the Microsoft token has no email claim", async () => {
        const accessToken = createAccessToken({ name: "No Email User" });

        getAuthorizeSession.mockReturnValue(createMockSession());
        fetchSpy.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ access_token: accessToken }),
        });

        mockCookies.values["bridge_id"] = "test-bridge-id";
        mockQueryState.value = { code: "test-code", state: MS_STATE };

        await handler(createEvent());

        expect(sendRedirectSpy).toHaveBeenCalledTimes(1);
        const redirectUrl = sendRedirectSpy.mock.calls[0][1];
        expect(redirectUrl).toContain("error=access_denied");
        expect(redirectUrl).toContain("Invalid+or+malformed+token");
        expect(createUserFromMicrosoftProfile).not.toHaveBeenCalled();
    });

    it("redirects with access_denied when the Microsoft token exchange throws", async () => {
        getAuthorizeSession.mockReturnValue(createMockSession());
        fetchSpy.mockRejectedValue(new Error("Network failure"));

        mockCookies.values["bridge_id"] = "test-bridge-id";
        mockQueryState.value = { code: "test-code", state: MS_STATE };

        await handler(createEvent());

        expect(sendRedirectSpy).toHaveBeenCalledTimes(1);
        const redirectUrl = sendRedirectSpy.mock.calls[0][1];
        expect(redirectUrl).toContain("error=access_denied");
        expect(redirectUrl).toContain("Network+failure");
    });

    it("exchanges the code with the correct verifier and redirect_uri, creates/updates the user, and redirects", async () => {
        const testUser = { id: 42, email: "user@example.com", name: "Test User" };
        const accessToken = createAccessToken({
            email: testUser.email,
            name: testUser.name,
        });

        getAuthorizeSession.mockReturnValue(createMockSession());
        createUserFromMicrosoftProfile.mockResolvedValue(testUser);
        fetchSpy.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ access_token: accessToken }),
        });

        mockCookies.values["bridge_id"] = "test-bridge-id";
        mockQueryState.value = { code: "test-code", state: MS_STATE };

        await handler(createEvent());

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        const [tokenUrl, tokenOptions] = fetchSpy.mock.calls[0];
        expect(tokenUrl).toContain(
            "https://login.microsoftonline.com/test-tenant/oauth2/v2.0/token",
        );
        expect(tokenOptions.method).toBe("POST");
        expect(tokenOptions.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");

        const body = new URLSearchParams(tokenOptions.body);
        expect(body.get("client_id")).toBe("test-microsoft-client-id");
        expect(body.get("code")).toBe("test-code");
        expect(body.get("client_secret")).toBe("test-microsoft-client-secret");
        expect(body.get("code_verifier")).toBe(MS_VERIFIER);
        expect(body.get("redirect_uri")).toBe("http://localhost:3000/api/oauth2/mscallback");
        expect(body.get("grant_type")).toBe("authorization_code");
        expect(body.get("scope")).toBe("openid profile email");

        expect(createUserFromMicrosoftProfile).toHaveBeenCalledTimes(1);
        const [eventArg, emailArg, nameArg] = createUserFromMicrosoftProfile.mock.calls[0];
        expect(eventArg).toBeDefined();
        expect(emailArg).toBe(testUser.email);
        expect(nameArg).toBe(testUser.name);

        expect(sendRedirectSpy).toHaveBeenCalledTimes(1);
        const redirectUrl = sendRedirectSpy.mock.calls[0][1];
        expect(redirectUrl).toContain("https://example.com/callback");
        expect(redirectUrl).toContain("code=");
        expect(redirectUrl).toContain(`state=${BH_STATE}`);
    });

    it("redirects with the upstream error when Microsoft returns an error in the query", async () => {
        getAuthorizeSession.mockReturnValue(createMockSession());
        mockCookies.values["bridge_id"] = "test-bridge-id";
        mockQueryState.value = {
            error: "access_denied",
            error_description: "User cancelled",
            state: MS_STATE,
        };

        await handler(createEvent());

        expect(sendRedirectSpy).toHaveBeenCalledTimes(1);
        const redirectUrl = sendRedirectSpy.mock.calls[0][1];
        expect(redirectUrl).toContain("error=access_denied");
        expect(redirectUrl).toContain("User+cancelled");
        expect(redirectUrl).toContain(`state=${BH_STATE}`);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("uses a default error description when Microsoft omits it", async () => {
        getAuthorizeSession.mockReturnValue(createMockSession());
        mockCookies.values["bridge_id"] = "test-bridge-id";
        mockQueryState.value = {
            error: "server_error",
            state: MS_STATE,
        };

        await handler(createEvent());

        const redirectUrl = sendRedirectSpy.mock.calls[0][1];
        expect(redirectUrl).toContain("error=server_error");
        expect(redirectUrl).toContain("Unknown+error");
    });

    it("redirects with access_denied when the access token has an invalid JWT format", async () => {
        getAuthorizeSession.mockReturnValue(createMockSession());
        fetchSpy.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ access_token: "not-a-jwt" }),
        });

        mockCookies.values["bridge_id"] = "test-bridge-id";
        mockQueryState.value = { code: "test-code", state: MS_STATE };

        await handler(createEvent());

        expect(sendRedirectSpy).toHaveBeenCalledTimes(1);
        const redirectUrl = sendRedirectSpy.mock.calls[0][1];
        expect(redirectUrl).toContain("error=access_denied");
        expect(redirectUrl).toContain("Invalid+or+malformed+token");
        expect(createUserFromMicrosoftProfile).not.toHaveBeenCalled();
    });

    it("redirects with access_denied when the access token payload cannot be decoded", async () => {
        getAuthorizeSession.mockReturnValue(createMockSession());
        fetchSpy.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ access_token: "header.not-base64.signature" }),
        });

        mockCookies.values["bridge_id"] = "test-bridge-id";
        mockQueryState.value = { code: "test-code", state: MS_STATE };

        await handler(createEvent());

        expect(sendRedirectSpy).toHaveBeenCalledTimes(1);
        const redirectUrl = sendRedirectSpy.mock.calls[0][1];
        expect(redirectUrl).toContain("error=access_denied");
        expect(redirectUrl).toContain("Invalid+or+malformed+token");
        expect(createUserFromMicrosoftProfile).not.toHaveBeenCalled();
    });
});

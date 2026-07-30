// Setup Nitro globals before importing anything that imports server/api files
// Use vi.mock (hoisted) since ESM static imports are also hoisted
import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("~~/server/api/oauth2/session.post", () => ({
    addAuthorizeSession: vi.fn(),
    getAuthorizeSession: vi.fn(),
    completeAuthorizeSession: vi.fn(),
    generateExchangeCode: vi.fn(),
    exchangeAuthorizationCode: vi.fn(),
    constructSession: vi.fn(),
    removeIfSessionExpired: vi.fn(),
    attachAuthorizeSessionCookie: vi.fn(),
}));
vi.mock("~~/server/utils/database/oauth2_applications", () => ({
    getOAuth2Application: vi.fn(),
}));
vi.stubGlobal("defineEventHandler", (fn: any) => fn);
vi.stubGlobal("createError", (input: any) => {
    const err = new Error(input.message || input.statusMessage || "Error");
    (err as any).statusCode = input.statusCode ?? input.status ?? 500;
    (err as any).statusMessage = input.statusMessage;
    (err as any).data = input.data;
    return err;
});
vi.stubGlobal("readValidatedBody", vi.fn());
vi.stubGlobal("readBody", vi.fn());
vi.stubGlobal("getCookie", vi.fn());
vi.stubGlobal("setCookie", vi.fn());
vi.stubGlobal("deleteCookie", vi.fn());

import {
    usedSensitiveScopes,
    determinePostMicrosoft,
    completeConsentFlow,
    validateOAuth2AuthorizationRequest,
} from "~~/server/utils/oauth2-validate";
import { getOAuth2Application } from "~~/server/utils/database/oauth2_applications";

// ---------------------------------------------------------------------------
// usedSensitiveScopes
// ---------------------------------------------------------------------------

function makeSession(overrides: Partial<{ scopes: string[]; client_id: string }> = {}) {
    return {
        scopes: overrides.scopes ?? [],
        application: {
            client_id: overrides.client_id ?? "test-client",
        },
    } as any;
}

describe("usedSensitiveScopes", () => {
    it("returns true when session contains a sensitive scope", () => {
        // "meetings.read.all" is marked as sensitive in shared/oauth2-scopes.ts
        const session = makeSession({ scopes: ["openid", "meetings.read.all"] });

        expect(usedSensitiveScopes(session)).toBe(true);
    });

    it("returns true when session has multiple scopes including a sensitive one", () => {
        const session = makeSession({
            scopes: ["openid", "profile", "chat.read"],
        });

        // "chat.read" is sensitive
        expect(usedSensitiveScopes(session)).toBe(true);
    });

    it("returns false when session has only non-sensitive scopes", () => {
        const session = makeSession({ scopes: ["openid", "profile", "email"] });

        expect(usedSensitiveScopes(session)).toBe(false);
    });

    it("returns false when session has empty scopes array", () => {
        const session = makeSession({ scopes: [] });

        expect(usedSensitiveScopes(session)).toBe(false);
    });

    it("returns false when session has a single non-sensitive scope", () => {
        const session = makeSession({ scopes: ["openid"] });

        expect(usedSensitiveScopes(session)).toBe(false);
    });

    it('returns false for "meetings.read.application" which is not sensitive', () => {
        const session = makeSession({ scopes: ["meetings.read.application"] });

        expect(usedSensitiveScopes(session)).toBe(false);
    });

    it('returns false for "meetings.readwrite.application" which is not sensitive', () => {
        const session = makeSession({ scopes: ["meetings.readwrite.application"] });

        expect(usedSensitiveScopes(session)).toBe(false);
    });

    it('returns true for "meetings.readwrite.all" which is sensitive', () => {
        const session = makeSession({ scopes: ["meetings.readwrite.all"] });

        expect(usedSensitiveScopes(session)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// determinePostMicrosoft + completeConsentFlow
// ---------------------------------------------------------------------------

import { generateExchangeCode } from "~~/server/api/oauth2/session.post";

function makeFullSession(overrides: Partial<any> = {}) {
    return {
        application: { client_id: overrides.client_id ?? "test-client" },
        scopes: overrides.scopes ?? ["openid"],
        redirect_uri: overrides.redirect_uri ?? "https://example.com/callback",
        bh_state: overrides.bh_state ?? "state-value",
        bh_verifier_challenge: overrides.bh_verifier_challenge ?? "challenge",
        bh_verifier_challenge_method: overrides.bh_verifier_challenge_method ?? "S256",
        code: overrides.code ?? "exchange-code",
        login_state: overrides.login_state ?? "idle",
    } as any;
}

describe("determinePostMicrosoft", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (generateExchangeCode as any).mockImplementation((session: any) => {
            session.code = session.code || "exchange-code";
        });
    });

    it("returns a consent URL with URL-encoded parameters for sensitive scopes", () => {
        const session = makeFullSession({
            scopes: ["openid", "chat.read"],
            redirect_uri: "https://example.com/callback?extra=1",
            bh_state: "state with spaces",
        });

        const url = determinePostMicrosoft({}, session);
        const parsed = new URL("https://example.com" + url);

        expect(url.startsWith("/api/oauth2/authorize?")).toBe(true);
        expect(parsed.searchParams.get("client_id")).toBe("test-client");
        expect(parsed.searchParams.get("scope")).toBe("openid chat.read");
        expect(parsed.searchParams.get("redirect_uri")).toBe(
            "https://example.com/callback?extra=1",
        );
        expect(parsed.searchParams.get("state")).toBe("state with spaces");
        expect(parsed.searchParams.get("response_type")).toBe("code");
        expect(parsed.searchParams.get("code_challenge")).toBe("challenge");
        expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
    });

    it("omits code_challenge and code_challenge_method when missing", () => {
        const session = makeFullSession({
            scopes: ["openid", "chat.read"],
            bh_verifier_challenge: "",
            bh_verifier_challenge_method: "",
        });

        const url = determinePostMicrosoft({}, session);
        const parsed = new URL("https://example.com" + url);

        expect(parsed.searchParams.has("code_challenge")).toBe(false);
        expect(parsed.searchParams.has("code_challenge_method")).toBe(false);
    });

    it("completes the consent flow when no sensitive scopes are requested", () => {
        const session = makeFullSession({ scopes: ["openid", "profile"] });

        const url = determinePostMicrosoft({}, session);

        expect(url).toContain("https://example.com/callback?");
        expect(url).toContain("code=");
        expect(url).toContain("state=state-value");
    });
});

describe("completeConsentFlow", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (generateExchangeCode as any).mockImplementation((session: any) => {
            session.code = "test-code";
        });
    });

    it("uses ? when redirect_uri has no query string", () => {
        const session = makeFullSession({ redirect_uri: "https://example.com/callback" });

        const url = completeConsentFlow({}, session);

        expect(url).toBe("https://example.com/callback?code=test-code&state=state-value");
    });

    it("uses & when redirect_uri already has a query string", () => {
        const session = makeFullSession({
            redirect_uri: "https://example.com/callback?extra=1",
        });

        const url = completeConsentFlow({}, session);

        expect(url).toBe("https://example.com/callback?extra=1&code=test-code&state=state-value");
    });

    it("URL-encodes code and state values", () => {
        const session = makeFullSession({
            redirect_uri: "https://example.com/callback",
            bh_state: "state/with spaces",
        });
        (generateExchangeCode as any).mockImplementation((s: any) => {
            s.code = "code/with spaces";
        });

        const url = completeConsentFlow({}, session);

        expect(url).toBe(
            "https://example.com/callback?code=code%2Fwith%20spaces&state=state%2Fwith%20spaces",
        );
    });
});

// ---------------------------------------------------------------------------
// validateOAuth2AuthorizationRequest
// ---------------------------------------------------------------------------

describe("validateOAuth2AuthorizationRequest", () => {
    it("rejects unsupported response_type values", async () => {
        await expect(
            validateOAuth2AuthorizationRequest(
                {} as any,
                "test-client",
                "openid",
                "https://example.com/callback",
                "state",
                "token",
                "challenge",
                "S256",
            ),
        ).rejects.toMatchObject({
            statusCode: 400,
            statusMessage: "unsupported_response_type",
        });
    });

    it('allows response_type "code"', async () => {
        await expect(
            validateOAuth2AuthorizationRequest(
                {} as any,
                "test-client",
                "openid",
                "https://example.com/callback",
                "state",
                "code",
                "challenge",
                "S256",
            ),
        ).rejects.not.toMatchObject({
            statusMessage: "unsupported_response_type",
        });
    });

    it("rejects authorization requests without PKCE", async () => {
        await expect(
            validateOAuth2AuthorizationRequest(
                {} as any,
                "test-client",
                "openid",
                "https://example.com/callback",
                "state",
                "code",
                "",
                "",
            ),
        ).rejects.toMatchObject({
            statusCode: 400,
            statusMessage: "invalid_request: PKCE required",
        });
    });

    it("allows authorization requests with PKCE", async () => {
        await expect(
            validateOAuth2AuthorizationRequest(
                {} as any,
                "test-client",
                "openid",
                "https://example.com/callback",
                "state",
                "code",
                "challenge",
                "S256",
            ),
        ).rejects.not.toMatchObject({
            statusMessage: "invalid_request: PKCE required",
        });
    });

    it("rejects invalid code_challenge_method values (not S256 or plain)", async () => {
        await expect(
            validateOAuth2AuthorizationRequest(
                {} as any,
                "test-client",
                "openid",
                "https://example.com/callback",
                "state",
                "code",
                "challenge",
                "SHA1",
            ),
        ).rejects.toMatchObject({
            statusCode: 400,
            statusMessage: "invalid_request: code_challenge_method must be S256 or plain",
        });
    });

    it("rejects code_challenge_method with arbitrary string value", async () => {
        await expect(
            validateOAuth2AuthorizationRequest(
                {} as any,
                "test-client",
                "openid",
                "https://example.com/callback",
                "state",
                "code",
                "challenge",
                "custom",
            ),
        ).rejects.toMatchObject({
            statusCode: 400,
            statusMessage: "invalid_request: code_challenge_method must be S256 or plain",
        });
    });

    it("allows plain code_challenge_method (does not throw PKCE method error)", async () => {
        await expect(
            validateOAuth2AuthorizationRequest(
                {} as any,
                "test-client",
                "openid",
                "https://example.com/callback",
                "state",
                "code",
                "challenge",
                "plain",
            ),
        ).rejects.not.toMatchObject({
            statusMessage: "invalid_request: code_challenge_method must be S256 or plain",
        });
    });

    it("rejects when client_id is missing", async () => {
        await expect(
            validateOAuth2AuthorizationRequest(
                {} as any,
                "",
                "openid",
                "https://example.com/callback",
                "state",
                "code",
                "challenge",
                "S256",
            ),
        ).rejects.toMatchObject({
            statusCode: 400,
            message: "Parameter 'client_id' is required",
        });
    });

    it("rejects when scope is missing", async () => {
        await expect(
            validateOAuth2AuthorizationRequest(
                {} as any,
                "test-client",
                "",
                "https://example.com/callback",
                "state",
                "code",
                "challenge",
                "S256",
            ),
        ).rejects.toMatchObject({
            statusCode: 400,
            message: "Parameter 'scope' is required",
        });
    });

    it("rejects when state is missing", async () => {
        await expect(
            validateOAuth2AuthorizationRequest(
                {} as any,
                "test-client",
                "openid",
                "https://example.com/callback",
                "",
                "code",
                "challenge",
                "S256",
            ),
        ).rejects.toMatchObject({
            statusCode: 400,
            message: "Parameter 'state' is required",
        });
    });

    it("rejects when redirect_uri is missing", async () => {
        await expect(
            validateOAuth2AuthorizationRequest(
                {} as any,
                "test-client",
                "openid",
                "",
                "state",
                "code",
                "challenge",
                "S256",
            ),
        ).rejects.toMatchObject({
            statusCode: 400,
            message: "Parameter 'redirect_uri' is required",
        });
    });

    it("rejects when only code_challenge is provided", async () => {
        await expect(
            validateOAuth2AuthorizationRequest(
                {} as any,
                "test-client",
                "openid",
                "https://example.com/callback",
                "state",
                "code",
                "challenge",
                "",
            ),
        ).rejects.toMatchObject({
            statusCode: 400,
            statusMessage: "invalid_request: PKCE required",
        });
    });

    it("rejects an invalid percent-encoded scope", async () => {
        await expect(
            validateOAuth2AuthorizationRequest(
                {} as any,
                "test-client",
                "%ZZ-invalid",
                "https://example.com/callback",
                "state",
                "code",
                "challenge",
                "S256",
            ),
        ).rejects.toMatchObject({
            statusCode: 400,
            message: "Invalid 'scope' parameter",
        });
    });

    it("rejects when the decoded scope contains only whitespace", async () => {
        await expect(
            validateOAuth2AuthorizationRequest(
                {} as any,
                "test-client",
                "   ",
                "https://example.com/callback",
                "state",
                "code",
                "challenge",
                "S256",
            ),
        ).rejects.toMatchObject({
            statusCode: 400,
            message: "At least one scope must be requested",
        });
    });

    it("rejects when no application matches the client_id", async () => {
        (getOAuth2Application as any).mockResolvedValue(null);

        await expect(
            validateOAuth2AuthorizationRequest(
                { context: {} } as any,
                "unknown-client",
                "openid",
                "https://example.com/callback",
                "state",
                "code",
                "challenge",
                "S256",
            ),
        ).rejects.toMatchObject({
            statusCode: 404,
            message: "No matching application found for client_id 'unknown-client'",
        });
    });

    it("returns validated request data for a valid confidential app", async () => {
        (getOAuth2Application as any).mockResolvedValue({
            client_id: "test-client",
            name: "Test App",
            permissions: "openid profile",
            redirect_uris: "https://example.com/callback",
        });

        const result = await validateOAuth2AuthorizationRequest(
            { context: {} } as any,
            "test-client",
            "openid%20profile",
            "https://example.com/callback",
            "state",
            "code",
            "challenge",
            "S256",
        );

        expect(result).toMatchObject({
            client_id: "test-client",
            app_name: "Test App",
            requested_scopes: ["openid", "profile"],
            redirect_uri: "https://example.com/callback",
        });
    });

    it("rejects scopes not permitted by the application", async () => {
        (getOAuth2Application as any).mockResolvedValue({
            client_id: "test-client",
            name: "Test App",
            permissions: "openid",
            redirect_uris: "https://example.com/callback",
        });

        await expect(
            validateOAuth2AuthorizationRequest(
                { context: {} } as any,
                "test-client",
                "openid profile",
                "https://example.com/callback",
                "state",
                "code",
                "challenge",
                "S256",
            ),
        ).rejects.toMatchObject({
            statusCode: 403,
            message: expect.stringContaining(
                "does not have permission for the following scope(s): profile",
            ),
        });
    });

    it("rejects any scope when the application has no permissions", async () => {
        (getOAuth2Application as any).mockResolvedValue({
            client_id: "test-client",
            name: "Test App",
            permissions: null,
            redirect_uris: "https://example.com/callback",
        });

        await expect(
            validateOAuth2AuthorizationRequest(
                { context: {} } as any,
                "test-client",
                "openid",
                "https://example.com/callback",
                "state",
                "code",
                "challenge",
                "S256",
            ),
        ).rejects.toMatchObject({
            statusCode: 403,
            message: "Application 'Test App' has no configured permissions",
        });
    });

    it("rejects redirect_uri not registered for the application", async () => {
        (getOAuth2Application as any).mockResolvedValue({
            client_id: "test-client",
            name: "Test App",
            permissions: "openid",
            redirect_uris: "https://example.com/callback",
        });

        await expect(
            validateOAuth2AuthorizationRequest(
                { context: {} } as any,
                "test-client",
                "openid",
                "https://evil.com/callback",
                "state",
                "code",
                "challenge",
                "S256",
            ),
        ).rejects.toMatchObject({
            statusCode: 403,
            message: expect.stringContaining("does not allow redirect_uri"),
        });
    });

    it("rejects redirect_uri when the application has none configured", async () => {
        (getOAuth2Application as any).mockResolvedValue({
            client_id: "test-client",
            name: "Test App",
            permissions: "openid",
            redirect_uris: null,
        });

        await expect(
            validateOAuth2AuthorizationRequest(
                { context: {} } as any,
                "test-client",
                "openid",
                "https://example.com/callback",
                "state",
                "code",
                "challenge",
                "S256",
            ),
        ).rejects.toMatchObject({
            statusCode: 403,
            message: "Application 'Test App' has no configured redirect URIs",
        });
    });

    it("rejects when code_challenge_method is numeric string", async () => {
        await expect(
            validateOAuth2AuthorizationRequest(
                { context: {} } as any,
                "test-client",
                "openid",
                "https://example.com/callback",
                "state",
                "code",
                "challenge",
                "123",
            ),
        ).rejects.toMatchObject({
            statusCode: 400,
            statusMessage: "invalid_request: code_challenge_method must be S256 or plain",
        });
    });

    it("rejects when code_challenge is provided but method is empty", async () => {
        await expect(
            validateOAuth2AuthorizationRequest(
                { context: {} } as any,
                "test-client",
                "openid",
                "https://example.com/callback",
                "state",
                "code",
                "challenge",
                "",
            ),
        ).rejects.toMatchObject({
            statusCode: 400,
            statusMessage: "invalid_request: PKCE required",
        });
    });

    it("rejects when code_challenge is empty but method is valid", async () => {
        await expect(
            validateOAuth2AuthorizationRequest(
                { context: {} } as any,
                "test-client",
                "openid",
                "https://example.com/callback",
                "state",
                "code",
                "",
                "S256",
            ),
        ).rejects.toMatchObject({
            statusCode: 400,
            statusMessage: "invalid_request: PKCE required",
        });
    });

    it("allows plain code_challenge_method with valid challenge", async () => {
        (getOAuth2Application as any).mockResolvedValue({
            client_id: "test-client",
            name: "Test App",
            permissions: "openid",
            redirect_uris: "https://example.com/callback",
        });

        const result = await validateOAuth2AuthorizationRequest(
            { context: {} } as any,
            "test-client",
            "openid",
            "https://example.com/callback",
            "state",
            "code",
            "plain-challenge",
            "plain",
        );

        expect(result).toMatchObject({
            client_id: "test-client",
            requested_scopes: ["openid"],
        });
    });

    it("rejects scope with invalid percent encoding (%ZZ)", async () => {
        await expect(
            validateOAuth2AuthorizationRequest(
                { context: {} } as any,
                "test-client",
                "%ZZinvalid",
                "https://example.com/callback",
                "state",
                "code",
                "challenge",
                "S256",
            ),
        ).rejects.toMatchObject({
            statusCode: 400,
            message: "Invalid 'scope' parameter",
        });
    });

    it("rejects scope with only whitespace after decoding", async () => {
        await expect(
            validateOAuth2AuthorizationRequest(
                { context: {} } as any,
                "test-client",
                "%20%20%20",
                "https://example.com/callback",
                "state",
                "code",
                "challenge",
                "S256",
            ),
        ).rejects.toMatchObject({
            statusCode: 400,
            message: "At least one scope must be requested",
        });
    });

    it("allows empty response_type (treated as code by default)", async () => {
        (getOAuth2Application as any).mockResolvedValue({
            client_id: "test-client",
            name: "Test App",
            permissions: "openid",
            redirect_uris: "https://example.com/callback",
        });

        const result = await validateOAuth2AuthorizationRequest(
            {} as any,
            "test-client",
            "openid",
            "https://example.com/callback",
            "state",
            "",
            "challenge",
            "S256",
        );

        expect(result).toMatchObject({
            client_id: "test-client",
        });
    });

    describe("usedSensitiveScopes extended", () => {
        it("returns false for null scopes", () => {
            const session = makeSession({ scopes: null as any });
            expect(usedSensitiveScopes(session)).toBe(false);
        });

        it("returns false for undefined scopes", () => {
            const session = makeSession({ scopes: undefined as any });
            expect(usedSensitiveScopes(session)).toBe(false);
        });

        it('returns true for "meetings.read.all" which is admin sensitive', () => {
            const session = makeSession({ scopes: ["meetings.read.all"] });
            expect(usedSensitiveScopes(session)).toBe(true);
        });
    });

    describe("determinePostMicrosoft extended", () => {
        beforeEach(() => {
            vi.clearAllMocks();
            (generateExchangeCode as any).mockImplementation((session: any) => {
                session.code = session.code || "exchange-code";
            });
        });

        it("redirects to consent page when sensitive scopes requested", () => {
            const session = makeFullSession({
                scopes: ["openid", "chat.read"],
            });

            const url = determinePostMicrosoft({}, session);

            expect(url.startsWith("/api/oauth2/authorize?")).toBe(true);
            expect(url).toContain("scope=openid+chat.read");
            expect(url).toContain("client_id=test-client");
        });

        it("includes code_challenge in consent URL when present", () => {
            const session = makeFullSession({
                scopes: ["chat.read"],
                bh_verifier_challenge: "my-challenge",
                bh_verifier_challenge_method: "S256",
            });

            const url = determinePostMicrosoft({}, session);

            expect(url).toContain("code_challenge=my-challenge");
            expect(url).toContain("code_challenge_method=S256");
        });

        it("skips code_challenge in consent URL when not set", () => {
            const session = makeFullSession({
                scopes: ["chat.read"],
                bh_verifier_challenge: "",
                bh_verifier_challenge_method: "",
            });

            const url = determinePostMicrosoft({}, session);

            expect(url).not.toContain("code_challenge=");
            expect(url).not.toContain("code_challenge_method=");
        });
    });

    describe("completeConsentFlow extended", () => {
        beforeEach(() => {
            vi.clearAllMocks();
            (generateExchangeCode as any).mockImplementation((session: any) => {
                session.code = "ex-code";
            });
        });

        it("includes post_login_redirect when present", () => {
            const session = makeFullSession({
                redirect_uri: "https://example.com/callback",
            });
            session.post_login_redirect = "/dashboard";

            const url = completeConsentFlow({}, session);

            expect(url).toContain("redirect=%2Fdashboard");
        });

        it("omits redirect param when post_login_redirect is absent", () => {
            const session = makeFullSession({
                redirect_uri: "https://example.com/callback",
            });

            const url = completeConsentFlow({}, session);

            expect(url).not.toContain("redirect=");
        });

        it("sets login_state to completed", () => {
            const session = makeFullSession({});
            completeConsentFlow({}, session);

            expect(session.login_state).toBe("completed");
        });

        it("handles redirect_uri with fragment (fragment is stripped by URL constructor)", () => {
            const session = makeFullSession({
                redirect_uri: "https://example.com/callback#fragment",
            });

            const url = completeConsentFlow({}, session);

            expect(url).toContain("code=ex-code");
            expect(url).toContain("state=state-value");
        });
    });

    describe("validateOAuth2AuthorizationRequest parameter edge cases", () => {
        it("rejects when all required parameters are missing", async () => {
            await expect(
                validateOAuth2AuthorizationRequest(
                    {} as any,
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                ),
            ).rejects.toMatchObject({
                statusCode: 400,
                message: "Parameter 'client_id' is required",
            });
        });

        it("rejects scope with valid percent-encoded data", async () => {
            (getOAuth2Application as any).mockResolvedValue({
                client_id: "test-client",
                name: "Test App",
                permissions: "openid profile",
                redirect_uris: "https://example.com/callback",
            });

            const result = await validateOAuth2AuthorizationRequest(
                { context: {} } as any,
                "test-client",
                "openid%20profile",
                "https://example.com/callback",
                "state",
                "code",
                "challenge",
                "S256",
            );

            expect(result.requested_scopes).toEqual(["openid", "profile"]);
        });

        it("rejects when redirect_uri is only whitespace (fetches app, then fails redirect check)", async () => {
            (getOAuth2Application as any).mockResolvedValue({
                client_id: "test-client",
                name: "Test App",
                permissions: "openid",
                redirect_uris: "https://example.com/callback",
            });

            await expect(
                validateOAuth2AuthorizationRequest(
                    { context: {} } as any,
                    "test-client",
                    "openid",
                    "  ",
                    "state",
                    "code",
                    "challenge",
                    "S256",
                ),
            ).rejects.toMatchObject({
                statusCode: 403,
            });
        });
    });
});

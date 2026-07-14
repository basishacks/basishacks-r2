import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { resetMockState, setupNitroGlobals, mockQueryState } from "../helpers";

vi.mock("~~/server/utils/rateLimit", () => ({
    applyRateLimit: (fn: any) => fn,
    AUTH_RATE_LIMIT_CONFIG: { maxRequests: 600, windowMs: 60 * 1000 },
}));

let handler: any;
let constructOnSiteLoginURL: typeof import("~~/server/api/login.get").constructOnSiteLoginURL;

let setCookieSpy: ReturnType<typeof vi.fn>;
let sendRedirectSpy: ReturnType<typeof vi.fn>;

const ORIGINAL_CLIENT_ID = process.env.ONSITE_LOGIN_CLIENT_ID;
const ORIGIN_URL_ORIGIN = process.env.CURRENT_URL_ORIGIN;

beforeAll(async () => {
    setupNitroGlobals();

    setCookieSpy = vi.fn();
    sendRedirectSpy = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("setCookie", setCookieSpy);
    vi.stubGlobal("sendRedirect", sendRedirectSpy);

    const mod = await import("~~/server/api/login.get");
    handler = mod.default;
    constructOnSiteLoginURL = mod.constructOnSiteLoginURL;
});

beforeEach(() => {
    resetMockState();
    setCookieSpy.mockClear();
    sendRedirectSpy.mockClear();
    process.env.ONSITE_LOGIN_CLIENT_ID = "test-client-id";
    process.env.CURRENT_URL_ORIGIN = "http://localhost:3000";
});

afterEach(() => {
    if (ORIGINAL_CLIENT_ID === undefined) {
        delete process.env.ONSITE_LOGIN_CLIENT_ID;
    } else {
        process.env.ONSITE_LOGIN_CLIENT_ID = ORIGINAL_CLIENT_ID;
    }
    if (ORIGIN_URL_ORIGIN === undefined) {
        delete process.env.CURRENT_URL_ORIGIN;
    } else {
        process.env.CURRENT_URL_ORIGIN = ORIGIN_URL_ORIGIN;
    }
});

function createEvent(overrides: Record<string, unknown> = {}) {
    return {
        context: {},
        ...overrides,
    };
}

describe("constructOnSiteLoginURL", () => {
    it("throws 500 when ONSITE_LOGIN_CLIENT_ID is not set", () => {
        delete process.env.ONSITE_LOGIN_CLIENT_ID;

        expect(() => constructOnSiteLoginURL(createEvent())).toThrow(
            expect.objectContaining({
                statusCode: 500,
                message: "ONSITE_LOGIN_CLIENT_ID is not set",
            }),
        );
    });

    it("constructs a login URL without a post-login redirect", () => {
        const url = constructOnSiteLoginURL(createEvent());

        expect(url).toMatch(/^\/api\/oauth2\/authorize\?/);
        expect(url).toContain("client_id=test-client-id");
        expect(url).toContain("response_type=code");
        expect(url).toContain("redirect_uri=");
        expect(url).toContain("scope=openid+profile+email");
        expect(url).toContain("state=");
        expect(url).toContain("code_challenge=");
        expect(url).toContain("code_challenge_method=S256");
        expect(url).not.toContain("post_login_redirect");
    });

    it("constructs a login URL with a post-login redirect", () => {
        const url = constructOnSiteLoginURL(createEvent(), "/dashboard");

        expect(url).toContain("post_login_redirect=%2Fdashboard");
    });

    it("sets the pkce_verifier cookie", () => {
        constructOnSiteLoginURL(createEvent());

        expect(setCookieSpy).toHaveBeenCalledTimes(1);
        expect(setCookieSpy).toHaveBeenCalledWith(
            expect.anything(),
            "pkce_verifier",
            expect.any(String),
            expect.objectContaining({
                httpOnly: true,
                secure: true,
                sameSite: "lax",
                maxAge: 10 * 60,
            }),
        );
    });
});

describe("GET /api/login", () => {
    it("redirects using the redirect query parameter", async () => {
        mockQueryState.value = { redirect: "/dashboard" };

        await handler(createEvent());

        expect(sendRedirectSpy).toHaveBeenCalledTimes(1);
        const [event, redirectUrl, statusCode] = sendRedirectSpy.mock.calls[0];
        expect(event).toBeDefined();
        expect(redirectUrl).toContain("post_login_redirect=%2Fdashboard");
        expect(statusCode).toBe(302);
    });

    it("redirects without a redirect query parameter", async () => {
        mockQueryState.value = {};

        await handler(createEvent());

        expect(sendRedirectSpy).toHaveBeenCalledTimes(1);
        const [, redirectUrl] = sendRedirectSpy.mock.calls[0];
        expect(redirectUrl).not.toContain("post_login_redirect");
    });
});

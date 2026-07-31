import { vi, describe, it, expect, beforeAll, beforeEach } from "vitest";
import { resetMockState, setupNitroGlobals, mockCookies } from "../helpers";

vi.mock("~~/server/utils/rateLimit", () => ({
    applyRateLimit: (fn: any) => fn,
    AUTH_RATE_LIMIT_CONFIG: {},
}));

vi.mock("~~/server/api/oauth2/session.post", () => ({
    getAuthorizeSession: vi.fn(),
}));

let handler: any;
let getAuthorizeSession: ReturnType<typeof vi.fn>;

function createEvent() {
    return { context: {}, node: { req: {}, res: {} } } as any;
}

beforeAll(async () => {
    setupNitroGlobals();

    handler = (await import("~~/server/api/oauth2/to_microsoft.post")).default;
    const sessionMod = await import("~~/server/api/oauth2/session.post");
    getAuthorizeSession = sessionMod.getAuthorizeSession as any;
});

beforeEach(() => {
    resetMockState();
    getAuthorizeSession.mockReset();
});

describe("POST /api/oauth2/to_microsoft", () => {
    it("throws 400 when the bridge_id cookie is missing", async () => {
        await expect(handler(createEvent())).rejects.toMatchObject({
            statusCode: 400,
            message: "Cookie 'bridge_id' is required",
        });
    });

    it("throws 400 when the authorize session is not found", async () => {
        mockCookies.values["bridge_id"] = "expired-bridge-id";

        await expect(handler(createEvent())).rejects.toMatchObject({
            statusCode: 400,
            message: "session_expired",
        });
    });

    it("returns a Microsoft authorize URL and updates the session state", async () => {
        mockCookies.values["bridge_id"] = "valid-bridge-id";
        getAuthorizeSession.mockReturnValue({
            token: "valid-bridge-id",
            ms_state: null,
            ms_verifier: null,
            login_state: "identification",
        });

        const result = await handler(createEvent());

        expect(result).toHaveProperty("redirect_to");
        expect(result.redirect_to).toMatch(
            /^https:\/\/login\.microsoftonline\.com\/.*\/oauth2\/v2\.0\/authorize/,
        );
    });
});

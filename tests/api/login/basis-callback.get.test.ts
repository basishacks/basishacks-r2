import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { setupNitroGlobals } from "../helpers";

const mocks = vi.hoisted(() => ({
    complete: vi.fn(),
    getFlow: vi.fn(),
    linkUser: vi.fn(),
    clear: vi.fn(),
}));

vi.mock("~~/server/utils/rateLimit", () => ({
    applyRateLimit: (handler: any) => handler,
    AUTH_RATE_LIMIT_CONFIG: {},
}));
vi.mock("~~/server/utils/basis-auth", () => ({
    completeBasisAuthFlow: mocks.complete,
    getBasisAuthFlowSession: mocks.getFlow,
}));
vi.mock("~~/server/utils/database/users", () => ({
    findOrLinkBasisAuthUser: mocks.linkUser,
}));

let handler: any;
const replaceUserSessionMock = vi.fn();
const sendRedirectMock = vi.fn();

beforeAll(async () => {
    setupNitroGlobals();
    vi.stubGlobal("replaceUserSession", replaceUserSessionMock);
    vi.stubGlobal("sendRedirect", sendRedirectMock);
    vi.stubGlobal(
        "getRequestURL",
        vi.fn(() => new URL("https://hacks.example.test/api/auth/basis/callback?code=code")),
    );
    handler = (await import("~~/server/api/auth/basis/callback.get")).default;
});

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.getFlow.mockResolvedValue({
        data: {
            state: "state",
            nonce: "nonce",
            codeVerifier: "verifier",
            postLoginRedirect: "/teams",
        },
        clear: mocks.clear,
    });
    mocks.complete.mockResolvedValue({
        issuer: "https://auth.example.test",
        subject: "subject-1",
        email: "user@example.com",
        emailVerified: true,
    });
    mocks.linkUser.mockResolvedValue({ id: 17 });
});

describe("GET /api/auth/basis/callback", () => {
    it("clears the transaction, creates the existing local session, and redirects safely", async () => {
        await handler({ context: {} });

        expect(mocks.clear).toHaveBeenCalledOnce();
        expect(mocks.complete).toHaveBeenCalledWith(expect.any(URL), {
            state: "state",
            nonce: "nonce",
            codeVerifier: "verifier",
            postLoginRedirect: "/teams",
        });
        expect(replaceUserSessionMock).toHaveBeenCalledWith(expect.anything(), {
            user: { id: 17 },
        });
        expect(sendRedirectMock).toHaveBeenCalledWith(expect.anything(), "/teams", 302);
    });

    it("fails closed without creating a session when state, nonce, or PKCE validation fails", async () => {
        mocks.complete.mockRejectedValue(new Error("state mismatch"));

        await expect(handler({ context: {} })).rejects.toMatchObject({ statusCode: 401 });
        expect(mocks.clear).toHaveBeenCalledOnce();
        expect(replaceUserSessionMock).not.toHaveBeenCalled();
    });
});

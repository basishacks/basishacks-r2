import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    refresh: vi.fn(),
    revoke: vi.fn(),
    getSession: vi.fn(),
    replaceSession: vi.fn(),
    clearSession: vi.fn(),
}));

vi.mock("~~/server/utils/basis-auth", () => ({
    refreshBasisAuthTokens: mocks.refresh,
    revokeBasisAuthToken: mocks.revoke,
}));
vi.mock("~~/server/utils/rateLimit", () => ({
    applyRateLimit: (handler: any) => handler,
    AUTH_RATE_LIMIT_CONFIG: {},
}));

let tokenHandler: any;
let logoutHandler: any;

beforeAll(async () => {
    vi.stubGlobal("defineEventHandler", (handler: any) => handler);
    vi.stubGlobal("getUserSession", mocks.getSession);
    vi.stubGlobal("replaceUserSession", mocks.replaceSession);
    vi.stubGlobal("clearUserSession", mocks.clearSession);
    tokenHandler = (await import("~~/server/api/auth/token.post")).default;
    logoutHandler = (await import("~~/server/api/auth/logout.post")).default;
});

beforeEach(() => {
    vi.clearAllMocks();
});

const session = (expiresAt: number) => ({
    id: "session-1",
    user: { id: 7 },
    secure: {
        accessToken: "old-access",
        accessTokenExpiresAt: expiresAt,
        refreshToken: "old-refresh",
        scopes: ["Profile.all"],
    },
});

describe("POST /api/auth/token", () => {
    it("reuses an access token outside the expiry buffer", async () => {
        mocks.getSession.mockResolvedValue(session(Date.now() + 60_000));

        await expect(tokenHandler({})).resolves.toEqual({
            accessToken: "old-access",
            expiresAt: expect.any(Number),
        });
        expect(mocks.refresh).not.toHaveBeenCalled();
    });

    it("serializes concurrent refreshes and persists the rotated refresh token", async () => {
        const expired = session(Date.now() - 1);
        const rotated = {
            accessToken: "new-access",
            expiresAt: Date.now() + 600_000,
            refreshToken: "new-refresh",
            scopes: ["Profile.all"],
        };
        mocks.getSession.mockResolvedValue(expired);
        mocks.refresh.mockResolvedValue(rotated);
        mocks.replaceSession.mockResolvedValue({
            ...expired,
            secure: {
                accessToken: rotated.accessToken,
                accessTokenExpiresAt: rotated.expiresAt,
                refreshToken: rotated.refreshToken,
                scopes: rotated.scopes,
            },
        });

        const [first, second] = await Promise.all([tokenHandler({}), tokenHandler({})]);

        expect(first).toEqual(second);
        expect(mocks.refresh).toHaveBeenCalledTimes(1);
        expect(mocks.replaceSession).toHaveBeenCalledWith(expect.anything(), {
            user: { id: 7 },
            secure: expect.objectContaining({ refreshToken: "new-refresh" }),
        });
        expect(first).not.toHaveProperty("refreshToken");
    });

    it("clears an invalid session after refresh failure", async () => {
        mocks.getSession.mockResolvedValue(session(Date.now() - 1));
        mocks.refresh.mockRejectedValue(new Error("invalid_grant"));

        await expect(tokenHandler({})).rejects.toMatchObject({
            error: "invalid_token",
            status: 401,
        });
        expect(mocks.clearSession).toHaveBeenCalledOnce();
    });
});

describe("token logout", () => {
    it("revokes the refresh-token family and always clears the local session", async () => {
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        mocks.getSession.mockResolvedValue(session(Date.now() + 60_000));
        mocks.revoke.mockRejectedValue(new Error("provider unavailable"));

        await expect(logoutHandler({})).resolves.toEqual({ loggedOut: true });
        expect(mocks.revoke).toHaveBeenCalledWith("old-refresh");
        expect(mocks.clearSession).toHaveBeenCalledOnce();
    });
});

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    refresh: vi.fn(),
    revoke: vi.fn(),
    getSession: vi.fn(),
    clearSession: vi.fn(),
    getTokenSession: vi.fn(),
    saveTokenSession: vi.fn(),
    deleteTokenSession: vi.fn(),
}));

vi.mock("~~/server/utils/basis-auth", () => ({
    refreshBasisAuthTokens: mocks.refresh,
    revokeBasisAuthToken: mocks.revoke,
}));
vi.mock("~~/server/utils/rateLimit", () => ({
    applyRateLimit: (handler: any) => handler,
    AUTH_RATE_LIMIT_CONFIG: {},
}));
vi.mock("~~/server/utils/database/basis-auth-sessions", () => ({
    getBasisAuthSession: mocks.getTokenSession,
    saveBasisAuthSession: mocks.saveTokenSession,
    deleteBasisAuthSession: mocks.deleteTokenSession,
}));

let tokenHandler: any;
let logoutHandler: any;

beforeAll(async () => {
    vi.stubGlobal("defineEventHandler", (handler: any) => handler);
    vi.stubGlobal("getUserSession", mocks.getSession);
    vi.stubGlobal("clearUserSession", mocks.clearSession);
    tokenHandler = (await import("~~/server/api/auth/token.post")).default;
    logoutHandler = (await import("~~/server/api/auth/logout.post")).default;
});

beforeEach(() => {
    vi.clearAllMocks();
});

const session = () => ({
    id: "session-1",
    user: { id: 7 },
});

const tokenSession = (expiresAt: number) => ({
    accessToken: "old-access",
    accessTokenExpiresAt: expiresAt,
    refreshToken: "old-refresh",
});

const unsignedToken = (permissions: string[]) =>
    `eyJhbGciOiJub25lIn0.${Buffer.from(JSON.stringify({ permissions })).toString("base64url")}.`;

describe("POST /api/auth/token", () => {
    it("reuses an access token outside the expiry buffer", async () => {
        const expiresAt = Date.now() + 60_000;
        mocks.getSession.mockResolvedValue(session());
        mocks.getTokenSession.mockReturnValue(tokenSession(expiresAt));

        await expect(tokenHandler({})).resolves.toEqual({
            accessToken: "old-access",
            expiresAt,
            permissions: [],
        });
        expect(mocks.refresh).not.toHaveBeenCalled();
    });

    it("returns effective granular permissions for a legacy participant token", async () => {
        const expiresAt = Date.now() + 60_000;
        const accessToken = unsignedToken(["participant"]);
        mocks.getSession.mockResolvedValue(session());
        mocks.getTokenSession.mockReturnValue({
            ...tokenSession(expiresAt),
            accessToken,
        });

        await expect(tokenHandler({})).resolves.toMatchObject({
            permissions: expect.arrayContaining([
                "participant",
                "nethack.Profile.updateSelf",
                "nethack.Projects.submitOwn",
                "nethack.Voting.submitOwn",
            ]),
        });
    });

    it("serializes concurrent refreshes and persists the rotated refresh token", async () => {
        const expired = session();
        mocks.getTokenSession.mockReturnValue(tokenSession(Date.now() - 1));
        const rotated = {
            accessToken: "new-access",
            expiresAt: Date.now() + 600_000,
            refreshToken: "new-refresh",
        };
        mocks.getSession.mockResolvedValue(expired);
        mocks.refresh.mockResolvedValue(rotated);

        const [first, second] = await Promise.all([tokenHandler({}), tokenHandler({})]);

        expect(first).toEqual(second);
        expect(mocks.refresh).toHaveBeenCalledTimes(1);
        expect(mocks.saveTokenSession).toHaveBeenCalledWith(expect.anything(), "session-1", 7, {
            accessToken: "new-access",
            accessTokenExpiresAt: rotated.expiresAt,
            refreshToken: "new-refresh",
        });
        expect(first).not.toHaveProperty("refreshToken");
    });

    it("clears an invalid session after refresh failure", async () => {
        mocks.getSession.mockResolvedValue(session());
        mocks.getTokenSession.mockReturnValue(tokenSession(Date.now() - 1));
        mocks.refresh.mockRejectedValue(new Error("invalid_grant"));

        await expect(tokenHandler({})).rejects.toMatchObject({
            error: "invalid_token",
            status: 401,
        });
        expect(mocks.clearSession).toHaveBeenCalledOnce();
        expect(mocks.deleteTokenSession).toHaveBeenCalledWith(expect.anything(), "session-1");
    });

    it("clears a browser session that has no matching server-side token session", async () => {
        mocks.getSession.mockResolvedValue(session());
        mocks.getTokenSession.mockReturnValue(undefined);

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
        mocks.getSession.mockResolvedValue(session());
        mocks.getTokenSession.mockReturnValue(tokenSession(Date.now() + 60_000));
        mocks.revoke.mockRejectedValue(new Error("provider unavailable"));

        await expect(logoutHandler({})).resolves.toEqual({ loggedOut: true });
        expect(mocks.revoke).toHaveBeenCalledWith("old-refresh");
        expect(mocks.clearSession).toHaveBeenCalledOnce();
        expect(mocks.deleteTokenSession).toHaveBeenCalledWith(expect.anything(), "session-1");
    });
});

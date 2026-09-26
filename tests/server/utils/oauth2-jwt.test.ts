import { beforeEach, describe, expect, it, vi } from "vitest";

const { jwtVerifyMock, createRemoteJWKSetMock, getUserBySubjectMock } = vi.hoisted(() => ({
    jwtVerifyMock: vi.fn(),
    createRemoteJWKSetMock: vi.fn(() => "jwks"),
    getUserBySubjectMock: vi.fn(),
}));

vi.mock("jose", () => ({
    createRemoteJWKSet: createRemoteJWKSetMock,
    jwtVerify: jwtVerifyMock,
}));

vi.mock("~~/server/utils/basis-auth", () => ({
    getBasisAuthConfig: () => ({
        issuer: "https://auth.example.test",
        clientId: "basishacks",
        clientSecret: "secret",
        resource: "devconnect://nethack.bisz.dev",
    }),
    getFreshBasisAuthUserSession: vi.fn(),
}));

vi.mock("~~/server/utils/database/users", () => ({
    getUserByBasisAuthSubject: getUserBySubjectMock,
}));

import {
    extractBearerToken,
    resolveOAuth2User,
    verifyAccessToken,
} from "~~/server/utils/oauth2-jwt";

const event = () => ({ context: {} }) as any;
const claims = {
    sub: "user-1",
    client_id: "portal",
    scope: "chat.readwrite",
    permissions: ["Users.read"],
    jti: "token-id",
    iat: 100,
    exp: 200,
    iss: "https://auth.example.test",
    aud: "devconnect://nethack.bisz.dev",
};

beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("createError", (input: any) => {
        const error = new Error(input.message);
        Object.assign(error, input);
        return error;
    });
    vi.stubGlobal("getHeader", vi.fn());
});

describe("basis-auth access tokens", () => {
    it("validates RS256, the exact issuer, resource audience, type, expiry, and claims", async () => {
        jwtVerifyMock.mockResolvedValue({
            payload: claims,
        });

        await expect(verifyAccessToken("token")).resolves.toMatchObject({ sub: "user-1" });
        expect(createRemoteJWKSetMock).toHaveBeenCalledWith(
            new URL("https://auth.example.test/oauth/jwks"),
        );
        expect(jwtVerifyMock).toHaveBeenCalledWith("token", "jwks", {
            algorithms: ["RS256"],
            issuer: "https://auth.example.test",
            audience: "devconnect://nethack.bisz.dev",
            typ: "at+jwt",
        });
    });

    it.each([
        { client_id: "portal", scope: "chat.readwrite" },
        { sub: "user-1", scope: "chat.readwrite" },
        { sub: "user-1", client_id: "portal" },
    ])("rejects an access token missing required claims", async (payload) => {
        jwtVerifyMock.mockResolvedValue({ payload });
        await expect(verifyAccessToken("token")).rejects.toMatchObject({
            statusCode: 401,
            statusMessage: "invalid_token",
        });
    });

    it("rejects invalid signatures, issuers, audiences, types, and expired tokens", async () => {
        jwtVerifyMock.mockRejectedValue(new Error("JWT verification failed"));
        await expect(verifyAccessToken("token")).rejects.toMatchObject({ statusCode: 401 });
    });

    it("maps the stable issuer and subject to the local user", async () => {
        const user = { id: 42 };
        getUserBySubjectMock.mockResolvedValue(user);
        await expect(resolveOAuth2User(event(), { sub: "user-1" })).resolves.toBe(user);
        expect(getUserBySubjectMock).toHaveBeenCalledWith(
            expect.anything(),
            "https://auth.example.test",
            "user-1",
        );
    });
});

describe("OAuth2 bearer parsing", () => {
    it("extracts case-insensitive bearer tokens and rejects malformed headers", () => {
        vi.mocked(getHeader).mockReturnValue("bEaReR token");
        expect(extractBearerToken(event())).toBe("token");
        vi.mocked(getHeader).mockReturnValue("Basic token");
        expect(() => extractBearerToken(event())).toThrow();
    });
});

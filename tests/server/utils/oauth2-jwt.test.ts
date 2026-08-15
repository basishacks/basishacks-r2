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
        resource: "urn:basis:api:basishacks",
    }),
}));

vi.mock("~~/server/utils/database/users", () => ({
    getUserByBasisAuthSubject: getUserBySubjectMock,
}));

import {
    extractBearerToken,
    parseJWScopes,
    requireScopes,
    resolveOAuth2User,
    verifyAccessToken,
    withOAuth2JWT,
} from "~~/server/utils/oauth2-jwt";

const event = () => ({ context: {} }) as any;

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
            payload: { sub: "user-1", client_id: "portal", scope: "chat.readwrite" },
        });

        await expect(verifyAccessToken("token")).resolves.toMatchObject({ sub: "user-1" });
        expect(createRemoteJWKSetMock).toHaveBeenCalledWith(
            new URL("https://auth.example.test/oauth/jwks"),
        );
        expect(jwtVerifyMock).toHaveBeenCalledWith("token", "jwks", {
            algorithms: ["RS256"],
            issuer: "https://auth.example.test",
            audience: "urn:basis:api:basishacks",
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

describe("OAuth2 bearer helpers", () => {
    it("extracts case-insensitive bearer tokens and rejects malformed headers", () => {
        vi.mocked(getHeader).mockReturnValue("bEaReR token");
        expect(extractBearerToken(event())).toBe("token");
        vi.mocked(getHeader).mockReturnValue("Basic token");
        expect(() => extractBearerToken(event())).toThrow();
    });

    it("parses and enforces scopes", () => {
        expect(parseJWScopes("chat.readwrite   profile")).toEqual(["chat.readwrite", "profile"]);
        expect(parseJWScopes(undefined)).toEqual([]);
        expect(() => requireScopes(["chat.readwrite"], ["chat.readwrite"])).not.toThrow();
        expect(() => requireScopes([], ["chat.readwrite"])).toThrow(
            expect.objectContaining({ statusCode: 403 }),
        );
    });

    it("attaches the verified token context before invoking a wrapped handler", async () => {
        vi.mocked(getHeader).mockReturnValue("Bearer token");
        jwtVerifyMock.mockResolvedValue({
            payload: { sub: "user-1", client_id: "portal", scope: "chat.readwrite" },
        });
        const wrapped = withOAuth2JWT(async (request) => request.context.oauth2, {
            requiredScopes: ["chat.readwrite"],
        });

        await expect(wrapped(event())).resolves.toMatchObject({
            payload: { sub: "user-1" },
            scopes: ["chat.readwrite"],
        });
    });
});

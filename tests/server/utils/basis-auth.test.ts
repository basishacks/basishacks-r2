import { beforeEach, describe, expect, it, vi } from "vitest";

const oidc = vi.hoisted(() => ({
    discovery: vi.fn(),
    ClientSecretBasic: vi.fn(() => "client-auth"),
    allowInsecureRequests: vi.fn(),
    randomState: vi.fn(() => "state"),
    randomNonce: vi.fn(() => "nonce"),
    randomPKCECodeVerifier: vi.fn(() => "verifier"),
    calculatePKCECodeChallenge: vi.fn(async () => "challenge"),
    buildAuthorizationUrl: vi.fn(() => new URL("https://auth.example.test/oauth/authorize")),
    authorizationCodeGrant: vi.fn(),
    fetchUserInfo: vi.fn(),
}));

vi.mock("openid-client", () => oidc);
vi.mock("~~/server/utils/oauth2", () => ({
    getPublicOrigin: () => "https://hacks.example.test",
}));

import {
    beginBasisAuthFlow,
    completeBasisAuthFlow,
    getBasisAuthCallbackUrl,
    sanitizePostLoginRedirect,
} from "~~/server/utils/basis-auth";

beforeEach(() => {
    vi.clearAllMocks();
    process.env.BASIS_AUTH_ISSUER = "https://auth.example.test/";
    process.env.BASIS_AUTH_CLIENT_ID = "basishacks";
    process.env.BASIS_AUTH_CLIENT_SECRET = "secret";
    process.env.BASIS_AUTH_RESOURCE = "urn:basis:api:basishacks";
    vi.stubGlobal("createError", (input: any) => Object.assign(new Error(input.message), input));
    oidc.discovery.mockResolvedValue("configuration");
});

describe("basis-auth authorization-code flow", () => {
    it("uses S256 PKCE, state, nonce, the configured resource, and derived callback URL", async () => {
        const result = await beginBasisAuthFlow("/dashboard");

        expect(getBasisAuthCallbackUrl()).toBe(
            "https://hacks.example.test/api/auth/basis/callback",
        );
        expect(oidc.discovery).toHaveBeenCalledWith(
            new URL("https://auth.example.test"),
            "basishacks",
            expect.objectContaining({ token_endpoint_auth_method: "client_secret_basic" }),
            "client-auth",
            undefined,
        );
        expect(oidc.buildAuthorizationUrl).toHaveBeenCalledWith("configuration", {
            redirect_uri: "https://hacks.example.test/api/auth/basis/callback",
            response_type: "code",
            scope: "openid profile email",
            resource: "urn:basis:api:basishacks",
            state: "state",
            nonce: "nonce",
            code_challenge: "challenge",
            code_challenge_method: "S256",
        });
        expect(result.transaction).toEqual({
            state: "state",
            nonce: "nonce",
            codeVerifier: "verifier",
            postLoginRedirect: "/dashboard",
        });
    });

    it("validates the stored transaction and builds identity from ID token plus UserInfo", async () => {
        oidc.authorizationCodeGrant.mockResolvedValue({
            access_token: "access-token",
            claims: () => ({ sub: "subject-1" }),
        });
        oidc.fetchUserInfo.mockResolvedValue({
            email: "user@example.com",
            email_verified: true,
            name: "User",
        });

        await expect(
            completeBasisAuthFlow(
                new URL("https://untrusted.example/api/auth/basis/callback?code=code&state=state"),
                { state: "state", nonce: "nonce", codeVerifier: "verifier" },
            ),
        ).resolves.toEqual({
            issuer: "https://auth.example.test",
            subject: "subject-1",
            email: "user@example.com",
            emailVerified: true,
            name: "User",
        });
        expect(oidc.authorizationCodeGrant).toHaveBeenCalledWith(
            "configuration",
            new URL("https://hacks.example.test/api/auth/basis/callback?code=code&state=state"),
            {
                pkceCodeVerifier: "verifier",
                expectedState: "state",
                expectedNonce: "nonce",
            },
        );
        expect(oidc.fetchUserInfo).toHaveBeenCalledWith(
            "configuration",
            "access-token",
            "subject-1",
        );
    });

    it("rejects expired transactions and unsafe post-login redirects", async () => {
        await expect(
            completeBasisAuthFlow(new URL("https://hacks.example.test"), {}),
        ).rejects.toThrow("missing or expired");
        expect(sanitizePostLoginRedirect("/dashboard?tab=team")).toBe("/dashboard?tab=team");
        expect(sanitizePostLoginRedirect("https://evil.example")).toBeUndefined();
        expect(sanitizePostLoginRedirect("//evil.example")).toBeUndefined();
    });
});

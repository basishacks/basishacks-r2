import { describe, it, expect, beforeEach } from "vitest";
import { vi } from "vitest";
import { OAuth2ScopesList } from "~~/shared/oauth2-scopes";
import { buildOpenIdConfiguration } from "~~/server/utils/openid-configuration";
import { getOAuth2Issuer, getPublicOrigin } from "~~/server/utils/oauth2";

describe("getPublicOrigin / getOAuth2Issuer", () => {
    beforeEach(() => {
        delete process.env.CURRENT_URL_ORIGIN;
    });

    it("defaults to http://localhost:3000", () => {
        expect(getPublicOrigin()).toBe("http://localhost:3000");
        expect(getOAuth2Issuer()).toBe("http://localhost:3000");
    });

    it("strips trailing slashes from CURRENT_URL_ORIGIN", () => {
        process.env.CURRENT_URL_ORIGIN = "https://hacks.example.com/";
        expect(getOAuth2Issuer()).toBe("https://hacks.example.com");
    });
});

describe("buildOpenIdConfiguration", () => {
    beforeEach(() => {
        process.env.CURRENT_URL_ORIGIN = "https://hacks.example.com";
    });

    it("uses CURRENT_URL_ORIGIN as issuer and prefixes endpoints", () => {
        const doc = buildOpenIdConfiguration();

        expect(doc.issuer).toBe("https://hacks.example.com");
        expect(doc.authorization_endpoint).toBe("https://hacks.example.com/api/oauth2/authorize");
        expect(doc.token_endpoint).toBe("https://hacks.example.com/api/oauth2/token");
        expect(doc.userinfo_endpoint).toBe("https://hacks.example.com/api/oauth2/userinfo");
    });

    it("accepts an explicit issuer override", () => {
        const doc = buildOpenIdConfiguration("https://custom.example");
        expect(doc.issuer).toBe("https://custom.example");
        expect(doc.token_endpoint).toBe("https://custom.example/api/oauth2/token");
    });

    it("advertises only implemented protocol surface", () => {
        const doc = buildOpenIdConfiguration();

        expect(doc.response_types_supported).toEqual(["code"]);
        expect(doc.grant_types_supported).toEqual(["authorization_code"]);
        expect(doc.code_challenge_methods_supported).toEqual(["S256"]);
        expect(doc.token_endpoint_auth_methods_supported).toEqual(["client_secret_post"]);
        expect(doc.scopes_supported).toEqual([...OAuth2ScopesList]);
        expect(doc.claims_supported).toContain("sub");
        expect(doc.claims_supported).toContain("email");
        expect(doc.id_token_signing_alg_values_supported).toEqual([]);
        expect(doc).not.toHaveProperty("jwks_uri");
        expect(doc).not.toHaveProperty("introspection_endpoint");
        expect(doc).not.toHaveProperty("revocation_endpoint");
        expect(doc).not.toHaveProperty("registration_endpoint");
    });
});

describe("GET /.well-known/openid-configuration route", () => {
    it("returns discovery metadata with cache headers", async () => {
        process.env.CURRENT_URL_ORIGIN = "https://hacks.example.com";

        const headers: Record<string, string> = {};
        vi.stubGlobal("defineEventHandler", (fn: any) => fn);
        vi.stubGlobal("setHeader", (_event: any, name: string, value: string) => {
            headers[name] = value;
        });

        const handler = (await import("~~/server/routes/.well-known/openid-configuration.get"))
            .default;
        const result = await handler({} as any);

        expect(result.issuer).toBe("https://hacks.example.com");
        expect(result.authorization_endpoint).toBe(
            "https://hacks.example.com/api/oauth2/authorize",
        );
        expect(headers["Cache-Control"]).toBe("public, max-age=3600");
        expect(headers["Content-Type"]).toBe("application/json");
    });
});

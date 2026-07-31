import oAuth2Config, {
    structureLink,
    getMicrosoftRedirectUri,
    buildMicrosoftRedirectUri,
    getOnsiteRedirectPath,
    buildOnsiteRedirectUri,
} from "~~/server/utils/oauth2";
import { createHash } from "crypto";
import { vi, describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";

// Stub defineEventHandler so importing the API route module doesn't fail.
// to_microsoft.post.ts calls defineEventHandler() at module load for its default export.
vi.stubGlobal("defineEventHandler", (fn: any) => fn);

let generateMicrosoftOAuth2Link: typeof import("~~/server/api/oauth2/to_microsoft.post").generateMicrosoftOAuth2Link;

beforeAll(async () => {
    const mod = await import("~~/server/api/oauth2/to_microsoft.post");
    generateMicrosoftOAuth2Link = mod.generateMicrosoftOAuth2Link;
});

// ---------------------------------------------------------------------------
// structureLink
// ---------------------------------------------------------------------------

function getParam(link: string, name: string): string | null {
    const parsed = new URL(link);
    return parsed.searchParams.get(name);
}

describe("redirect URI helpers", () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        vi.resetModules();
        delete process.env.MICROSOFT_REDIRECT_URI;
        delete process.env.REDIRECT_URI;
        delete process.env.CURRENT_URL_ORIGIN;
    });

    afterEach(() => {
        if (originalEnv.MICROSOFT_REDIRECT_URI === undefined) {
            delete process.env.MICROSOFT_REDIRECT_URI;
        } else {
            process.env.MICROSOFT_REDIRECT_URI = originalEnv.MICROSOFT_REDIRECT_URI;
        }
        if (originalEnv.REDIRECT_URI === undefined) {
            delete process.env.REDIRECT_URI;
        } else {
            process.env.REDIRECT_URI = originalEnv.REDIRECT_URI;
        }
        if (originalEnv.CURRENT_URL_ORIGIN === undefined) {
            delete process.env.CURRENT_URL_ORIGIN;
        } else {
            process.env.CURRENT_URL_ORIGIN = originalEnv.CURRENT_URL_ORIGIN;
        }
    });

    it("getMicrosoftRedirectUri returns env value or default", () => {
        expect(getMicrosoftRedirectUri()).toBe("/api/oauth2/mscallback");
        process.env.MICROSOFT_REDIRECT_URI = "/custom/ms";
        expect(getMicrosoftRedirectUri()).toBe("/custom/ms");
    });

    it("buildMicrosoftRedirectUri builds absolute URL from env and default path", () => {
        process.env.CURRENT_URL_ORIGIN = "https://app.example.com";
        expect(buildMicrosoftRedirectUri()).toBe("https://app.example.com/api/oauth2/mscallback");
    });

    it("buildMicrosoftRedirectUri uses provided origin and redirect path", () => {
        expect(buildMicrosoftRedirectUri("https://custom.example.com", "/cb")).toBe(
            "https://custom.example.com/cb",
        );
    });

    it("buildMicrosoftRedirectUri falls back to localhost when origin missing", () => {
        expect(buildMicrosoftRedirectUri(undefined, "/cb")).toBe("http://localhost:3000/cb");
    });

    it("getOnsiteRedirectPath returns env value or default", () => {
        expect(getOnsiteRedirectPath()).toBe("/api/oauth2/dccallback");
        process.env.REDIRECT_URI = "/custom/dc";
        expect(getOnsiteRedirectPath()).toBe("/custom/dc");
    });

    it("buildOnsiteRedirectUri builds absolute URL from env and default path", () => {
        process.env.CURRENT_URL_ORIGIN = "https://app.example.com";
        expect(buildOnsiteRedirectUri()).toBe("https://app.example.com/api/oauth2/dccallback");
    });

    it("buildOnsiteRedirectUri uses provided origin", () => {
        expect(buildOnsiteRedirectUri("https://custom.example.com")).toBe(
            "https://custom.example.com/api/oauth2/dccallback",
        );
    });

    it("buildOnsiteRedirectUri falls back to localhost when origin missing", () => {
        expect(buildOnsiteRedirectUri()).toBe("http://localhost:3000/api/oauth2/dccallback");
    });

    it("oAuth2Config redirectUri getter returns getMicrosoftRedirectUri()", () => {
        process.env.MICROSOFT_REDIRECT_URI = "/config/ms";
        expect(oAuth2Config.redirectUri).toBe("/config/ms");
    });

    it("falls back to empty tenant and clientId when env vars are unset", async () => {
        const originalTenant = process.env.MICROSOFT_TENANT_ID;
        const originalClientId = process.env.MICROSOFT_CLIENT_ID;
        delete process.env.MICROSOFT_TENANT_ID;
        delete process.env.MICROSOFT_CLIENT_ID;

        const mod = await import("~~/server/utils/oauth2");
        expect(mod.default.tenant).toBe("");
        expect(mod.default.clientId).toBe("");

        if (originalTenant === undefined) {
            delete process.env.MICROSOFT_TENANT_ID;
        } else {
            process.env.MICROSOFT_TENANT_ID = originalTenant;
        }
        if (originalClientId === undefined) {
            delete process.env.MICROSOFT_CLIENT_ID;
        } else {
            process.env.MICROSOFT_CLIENT_ID = originalClientId;
        }
    });
});

// ---------------------------------------------------------------------------
// structureLink
// ---------------------------------------------------------------------------

describe("structureLink", () => {
    const expectedBase =
        "https://login.microsoftonline.com/cbc6e1e2-a6bb-4002-bbdc-6da892a051a7/oauth2/v2.0/authorize";

    beforeEach(() => {
        // Ensure a consistent base URL for testing
        process.env.CURRENT_URL_ORIGIN = "http://localhost:3000";
    });

    it("builds a URL with default scope and redirect_uri", () => {
        const link = structureLink("test-state", "test-challenge");

        expect(link.startsWith(expectedBase + "?")).toBe(true);
        expect(getParam(link, "client_id")).toBe("868b989e-6574-4795-bcfb-8db37bee1c37");
        expect(getParam(link, "response_type")).toBe("code");
        expect(getParam(link, "redirect_uri")).toBe("http://localhost:3000/api/oauth2/mscallback");
        expect(getParam(link, "state")).toBe("test-state");
        expect(getParam(link, "code_challenge")).toBe("test-challenge");
        expect(getParam(link, "code_challenge_method")).toBe("S256");
    });

    it('includes the default scope "openid profile email" URL-encoded', () => {
        const link = structureLink("s1", "c1");

        expect(getParam(link, "scope")).toBe("openid profile email");
    });

    it("accepts a custom scope", () => {
        const link = structureLink("s1", "c1", "openid email");

        expect(getParam(link, "scope")).toBe("openid email");
    });

    it("accepts a custom redirect_uri", () => {
        const link = structureLink("s1", "c1", "openid", "/custom/callback");

        expect(getParam(link, "redirect_uri")).toBe("http://localhost:3000/custom/callback");
    });

    it("prepends CURRENT_URL_ORIGIN to the redirect_uri", () => {
        process.env.CURRENT_URL_ORIGIN = "https://example.com";
        const link = structureLink("s1", "c1", "openid", "/my/callback");

        expect(getParam(link, "redirect_uri")).toBe("https://example.com/my/callback");
    });

    it("falls back to http://localhost:3000 when CURRENT_URL_ORIGIN is not set", () => {
        delete process.env.CURRENT_URL_ORIGIN;
        const link = structureLink("s1", "c1", "openid", "/fallback");

        expect(getParam(link, "redirect_uri")).toBe("http://localhost:3000/fallback");
    });

    it("URL-encodes scope values with special characters", () => {
        const link = structureLink("s1", "c1", "openid profile email offline_access");

        expect(getParam(link, "scope")).toBe("openid profile email offline_access");
    });

    it("preserves state and code_challenge values exactly", () => {
        const link = structureLink("abc123-xyz", "challenge_value_!@#");

        expect(getParam(link, "state")).toBe("abc123-xyz");
        expect(getParam(link, "code_challenge")).toBe("challenge_value_!@#");
    });

    it("produces a URL that starts with the correct Microsoft OAuth2 base", () => {
        const link = structureLink("s1", "c1");

        expect(link.startsWith(expectedBase)).toBe(true);
    });

    it("includes all required query parameters", () => {
        const link = structureLink("s1", "c1");
        const parsed = new URL(link);

        const requiredParams = [
            "client_id",
            "response_type",
            "redirect_uri",
            "scope",
            "state",
            "code_challenge",
            "code_challenge_method",
        ];

        for (const param of requiredParams) {
            expect(parsed.searchParams.has(param)).toBe(true);
        }
    });

    it("URL-encodes redirect_uri, state and code_challenge values", () => {
        const link = structureLink(
            "state with spaces/slashes",
            "challenge with spaces/slashes",
            "openid",
            "/callback?extra=1",
        );

        expect(getParam(link, "redirect_uri")).toBe("http://localhost:3000/callback?extra=1");
        expect(getParam(link, "state")).toBe("state with spaces/slashes");
        expect(getParam(link, "code_challenge")).toBe("challenge with spaces/slashes");
    });
});

// ---------------------------------------------------------------------------
// generateMicrosoftOAuth2Link
// ---------------------------------------------------------------------------

describe("generateMicrosoftOAuth2Link", () => {
    beforeEach(() => {
        process.env.CURRENT_URL_ORIGIN = "http://localhost:3000";
    });

    function makeSession(): any {
        return {
            token: "test-session-token",
            ms_state: null,
            ms_verifier: null,
        };
    }

    it("returns a Microsoft authorize URL string", () => {
        const session = makeSession();
        const link = generateMicrosoftOAuth2Link(session);

        expect(typeof link).toBe("string");
        expect(link.startsWith("https://login.microsoftonline.com/")).toBe(true);
        expect(link.includes("/oauth2/v2.0/authorize")).toBe(true);
    });

    it("sets ms_state and ms_verifier on the session", () => {
        const session = makeSession();
        generateMicrosoftOAuth2Link(session);

        expect(session.ms_state).toBeTruthy();
        expect(typeof session.ms_state).toBe("string");
        expect(session.ms_verifier).toBeTruthy();
        expect(typeof session.ms_verifier).toBe("string");
    });

    it("sets the state query param to match session.ms_state", () => {
        const session = makeSession();
        const link = generateMicrosoftOAuth2Link(session);

        expect(getParam(link, "state")).toBe(session.ms_state);
    });

    it("sets code_challenge to SHA256(ms_verifier) base64url", () => {
        const session = makeSession();
        const link = generateMicrosoftOAuth2Link(session);

        const expectedChallenge = createHash("sha256")
            .update(session.ms_verifier)
            .digest("base64url");

        expect(getParam(link, "code_challenge")).toBe(expectedChallenge);
    });

    it("always uses S256 as the code_challenge_method", () => {
        const session = makeSession();
        const link = generateMicrosoftOAuth2Link(session);

        expect(getParam(link, "code_challenge_method")).toBe("S256");
    });

    it("generates unique state and verifier on each call", () => {
        const session1 = makeSession();
        const session2 = makeSession();
        generateMicrosoftOAuth2Link(session1);
        generateMicrosoftOAuth2Link(session2);

        expect(session1.ms_state).not.toBe(session2.ms_state);
        expect(session1.ms_verifier).not.toBe(session2.ms_verifier);
    });
});

// ---------------------------------------------------------------------------
// Additional structureLink edge cases
// ---------------------------------------------------------------------------

describe("structureLink additional edge cases", () => {
    beforeEach(() => {
        process.env.CURRENT_URL_ORIGIN = "http://localhost:3000";
    });

    it("includes response_type=code always", () => {
        const link = structureLink("s1", "c1");
        expect(getParam(link, "response_type")).toBe("code");
    });

    it("includes code_challenge_method=S256 always", () => {
        const link = structureLink("s1", "c1");
        expect(getParam(link, "code_challenge_method")).toBe("S256");
    });

    it("handles extremely long state values", () => {
        const longState = "a".repeat(500);
        const link = structureLink(longState, "challenge");
        expect(getParam(link, "state")).toBe(longState);
    });

    it("handles extremely long code_challenge values", () => {
        const longChallenge = "b".repeat(500);
        const link = structureLink("state", longChallenge);
        expect(getParam(link, "code_challenge")).toBe(longChallenge);
    });

    it("handles state with special URL characters", () => {
        const link = structureLink("state+with&special=chars%20here", "c1");
        expect(getParam(link, "state")).toBe("state+with&special=chars%20here");
    });

    it("handles scope with special characters", () => {
        const link = structureLink("s1", "c1", "openid profile api://custom/scope");
        expect(getParam(link, "scope")).toBe("openid profile api://custom/scope");
    });

    it("handles redirect_uri with query parameters", () => {
        const link = structureLink("s1", "c1", "openid", "/callback?flow=signup");
        expect(getParam(link, "redirect_uri")).toBe("http://localhost:3000/callback?flow=signup");
    });

    it("handles empty scope string", () => {
        const link = structureLink("s1", "c1", "");
        expect(getParam(link, "scope")).toBe("");
    });

    it("handles scope with only spaces", () => {
        const link = structureLink("s1", "c1", "   ");
        expect(getParam(link, "scope")).toBe("   ");
    });

    it("handles state with unicode characters", () => {
        const link = structureLink("état-测试-状態", "c1");
        expect(getParam(link, "state")).toBe("état-测试-状態");
    });
});

// ---------------------------------------------------------------------------
// Additional redirect URI helper edge cases
// ---------------------------------------------------------------------------

describe("redirect URI helpers additional edge cases", () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        vi.resetModules();
        delete process.env.MICROSOFT_REDIRECT_URI;
        delete process.env.REDIRECT_URI;
        delete process.env.CURRENT_URL_ORIGIN;
    });

    afterEach(() => {
        if (originalEnv.MICROSOFT_REDIRECT_URI === undefined) {
            delete process.env.MICROSOFT_REDIRECT_URI;
        } else {
            process.env.MICROSOFT_REDIRECT_URI = originalEnv.MICROSOFT_REDIRECT_URI;
        }
        if (originalEnv.REDIRECT_URI === undefined) {
            delete process.env.REDIRECT_URI;
        } else {
            process.env.REDIRECT_URI = originalEnv.REDIRECT_URI;
        }
        if (originalEnv.CURRENT_URL_ORIGIN === undefined) {
            delete process.env.CURRENT_URL_ORIGIN;
        } else {
            process.env.CURRENT_URL_ORIGIN = originalEnv.CURRENT_URL_ORIGIN;
        }
    });

    it("getMicrosoftRedirectUri returns env MICROSOFT_REDIRECT_URI when set to custom value", () => {
        process.env.MICROSOFT_REDIRECT_URI = "/api/custom-ms-callback";
        expect(getMicrosoftRedirectUri()).toBe("/api/custom-ms-callback");
    });

    it("getMicrosoftRedirectUri falls back to default when env is empty string", () => {
        process.env.MICROSOFT_REDIRECT_URI = "";
        expect(getMicrosoftRedirectUri()).toBe("/api/oauth2/mscallback");
    });

    it("getOnsiteRedirectPath returns env REDIRECT_URI when set to custom value", () => {
        process.env.REDIRECT_URI = "/api/custom-dc-callback";
        expect(getOnsiteRedirectPath()).toBe("/api/custom-dc-callback");
    });

    it("getOnsiteRedirectPath falls back to default when env is empty string", () => {
        process.env.REDIRECT_URI = "";
        expect(getOnsiteRedirectPath()).toBe("/api/oauth2/dccallback");
    });

    it("buildMicrosoftRedirectUri uses MICROSOFT_REDIRECT_URI env when set", () => {
        process.env.MICROSOFT_REDIRECT_URI = "/env/ms";
        process.env.CURRENT_URL_ORIGIN = "https://env.example.com";
        expect(buildMicrosoftRedirectUri()).toBe("https://env.example.com/env/ms");
    });

    it("buildMicrosoftRedirectUri uses provided redirectPath over env", () => {
        process.env.MICROSOFT_REDIRECT_URI = "/env/ms";
        const result = buildMicrosoftRedirectUri("https://ex.com", "/override/ms");
        expect(result).toBe("https://ex.com/override/ms");
    });

    it("buildOnsiteRedirectUri uses provided origin over env", () => {
        process.env.CURRENT_URL_ORIGIN = "https://env-origin.com";
        const result = buildOnsiteRedirectUri("https://override-origin.com");
        expect(result).toBe("https://override-origin.com/api/oauth2/dccallback");
    });

    it("buildMicrosoftRedirectUri handles trailing slash in origin", () => {
        const result = buildMicrosoftRedirectUri("https://app.com/", "/cb");
        expect(result).toBe("https://app.com/cb");
    });

    it("buildOnsiteRedirectUri handles trailing slash in origin", () => {
        const result = buildOnsiteRedirectUri("https://app.com/");
        expect(result).toBe("https://app.com/api/oauth2/dccallback");
    });

    it("oAuth2Config has correct base URL", () => {
        expect(oAuth2Config.base).toBe("https://login.microsoftonline.com/");
    });

    it("oAuth2Config has correct responseType", () => {
        expect(oAuth2Config.responseType).toBe("code");
    });

    it("oAuth2Config has default scope", () => {
        expect(oAuth2Config.scope).toBe("openid profile email");
    });

    it("oAuth2Config redirectUri getter returns builtMicrosoftRedirectUri default path", () => {
        expect(oAuth2Config.redirectUri).toBe("/api/oauth2/mscallback");
    });

    it("buildMicrosoftRedirectUri handles non-standard redirect path", () => {
        const result = buildMicrosoftRedirectUri("https://app.example.com", "/oauth/callback");
        expect(result).toBe("https://app.example.com/oauth/callback");
    });

    it("buildOnsiteRedirectUri handles non-standard redirect path", () => {
        process.env.REDIRECT_URI = "/oauth/dc";
        process.env.CURRENT_URL_ORIGIN = "https://custom.app.com";
        expect(buildOnsiteRedirectUri()).toBe("https://custom.app.com/oauth/dc");
    });
});

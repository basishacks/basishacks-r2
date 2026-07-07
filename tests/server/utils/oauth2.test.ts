import { structureLink } from "~~/server/utils/oauth2";
import { createHash } from "crypto";
import { vi, describe, it, expect, beforeAll, beforeEach } from "vitest";

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

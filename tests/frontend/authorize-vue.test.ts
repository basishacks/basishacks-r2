import { describe, it, expect } from "vitest";
import { buildOAuth2SessionBody } from "~~/app/utils/oauth2";
import { escapeHtml } from "~~/app/utils/sanitize";

describe("authorize.vue session body helper", () => {
    it("forwards the OAuth2 state parameter correctly", () => {
        const body = buildOAuth2SessionBody({
            client_id: "client-id",
            response_type: "code",
            scope: "openid profile",
            state: "cross-site-request-forgery-token",
            code_challenge: "challenge",
            code_challenge_method: "S256",
            redirect_uri: "https://example.com/callback",
        });

        expect(body.state).toBe("cross-site-request-forgery-token");
        expect(body).toEqual({
            client_id: "client-id",
            response_type: "code",
            scope: "openid profile",
            state: "cross-site-request-forgery-token",
            code_challenge: "challenge",
            code_challenge_method: "S256",
            redirect_uri: "https://example.com/callback",
        });
    });
});

describe("authorize.vue error description sanitization", () => {
    it("escapes script tags so they are not executed", () => {
        const malicious = "<script>alert(1)</script>";
        const escaped = escapeHtml(malicious);
        expect(escaped).not.toContain("<script>");
        expect(escaped).toContain("&lt;script&gt;");
        expect(escaped).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
    });
});

describe("index.vue theme_description sanitization", () => {
    it("escapes script tags in the hackathon theme description", () => {
        const malicious = "<img src=x onerror=alert(1)>";
        const escaped = escapeHtml(malicious);
        expect(escaped).not.toContain("<img");
        expect(escaped).toContain("&lt;img");
        expect(escaped).toBe("&lt;img src=x onerror=alert(1)&gt;");
    });
});

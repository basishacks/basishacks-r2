import { createHash, randomBytes } from "crypto";
import { buildOnsiteRedirectUri } from "~~/server/utils/oauth2";
import { AuthorizeSession } from "./oauth2/session.post";

export function constructOnSiteLoginURL(event: any, postLoginRedirect?: string) {
    /* Constructs DevConnect OAuth URL with PKCE
     */
    const clientId = process.env.ONSITE_LOGIN_CLIENT_ID;
    if (!clientId) {
        throw createError({ statusCode: 500, message: "ONSITE_LOGIN_CLIENT_ID is not set" });
    }

    const state = randomBytes(128).toString("base64url");
    const code_verifier = randomBytes(32).toString("base64url");
    const code_challenge = createHash("sha256").update(code_verifier).digest("base64url");

    setCookie(event, "pkce_verifier", code_verifier, {
        maxAge: 10 * 60, // 10 mins, matching session expiry
        httpOnly: true,
        secure: true,
        sameSite: "lax",
    });

    const origin = process.env.CURRENT_URL_ORIGIN || "http://localhost:3000";
    const url = new URL("/api/oauth2/authorize", origin);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", buildOnsiteRedirectUri(origin));
    url.searchParams.set("scope", "openid profile email");
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", code_challenge);
    url.searchParams.set("code_challenge_method", "S256");
    if (postLoginRedirect) {
        url.searchParams.set("post_login_redirect", postLoginRedirect);
    }
    return url.pathname + url.search;
}

export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    await sendRedirect(
        event,
        constructOnSiteLoginURL(event, query.redirect as string | undefined),
        302,
    );
});

import { getAuthorizeSession } from "./session.post";
import { redeemAuthorizationCodeForToken } from "~~/server/utils/oauth2-token";
import { resolveUserInfoFromAccessToken } from "~~/server/utils/oauth2-userinfo";

/*
 * First-party onsite OAuth2 redirect_uri (basishacks connect).
 *
 * Follows the same logical steps as an external OIDC client:
 *   1. Validate state / PKCE
 *   2. Redeem authorization code → access token (shared token helper)
 *   3. Resolve identity via UserInfo claims (shared userinfo helper)
 *   4. Establish the site session
 *
 * Steps 2–3 run in-process (no self-HTTP). External clients still use
 * POST /api/oauth2/token and GET /api/oauth2/userinfo over the network;
 * those handlers call the same shared utilities.
 */
export default defineEventHandler(async (event) => {
    const error = getQuery(event).error;

    if (error) {
        const description = getQuery(event).error_description;
        console.log("[Authorize -> OAuth2] Recieved error: " + description);
        return await sendRedirect(event, "/", 302);
    }

    // Require bridge_id cookie to bind the callback to an existing authorize session
    const bridgeId = getCookie(event, "bridge_id");
    if (!bridgeId) {
        throw createError({
            statusCode: 400,
            message: "Missing bridge_id cookie",
        });
    }

    const session = getAuthorizeSession(bridgeId);
    if (!session) {
        throw createError({
            statusCode: 400,
            message: "Authorize session not found or expired",
        });
    }

    // Validate state parameter against the session's bh_state
    const state = getQuery(event).state as string | undefined;
    if (!state || state !== session.bh_state) {
        throw createError({
            statusCode: 400,
            message: "State parameter mismatch",
        });
    }

    console.log("[Authorize -> OAuth2] Dummy code: " + getQuery(event).code);

    // The PKCE verifier for the basishacks OAuth2 flow (client -> basishacks)
    // is stored in the pkce_verifier cookie set by constructOnSiteLoginURL.
    // session.ms_verifier is the verifier for the Microsoft flow (basishacks -> MS),
    // which is NOT the correct verifier to use here.
    const pkceVerifier = getCookie(event, "pkce_verifier");
    if (!pkceVerifier) {
        throw createError({
            statusCode: 400,
            message: "Missing PKCE verifier cookie. Please try logging in again.",
        });
    }

    let accessToken: string;
    try {
        // Same code→token path as POST /api/oauth2/token after client auth.
        // Client auth here is first-party: bridge_id + state + pkce_verifier cookies
        // (external clients authenticate with client_secret on the HTTP token endpoint).
        const tokenResponse = await redeemAuthorizationCodeForToken({
            code: getQuery(event).code as string,
            clientId: session.application.client_id,
            redirectUri: session.redirect_uri,
            appPermissions: session.scopes.join(" "),
            codeVerifier: pkceVerifier,
        });
        accessToken = tokenResponse.access_token;
    } catch (e: any) {
        throw createError({
            statusCode: 400,
            message: "invalid_grant: " + e.message,
        });
    }

    // Clear the PKCE verifier cookie now that it's been used
    deleteCookie(event, "pkce_verifier");

    // Same identity resolution as GET /api/oauth2/userinfo (in-process).
    const claims = await resolveUserInfoFromAccessToken(event, accessToken);
    const userId = Number(claims.sub);
    if (!userId || Number.isNaN(userId)) {
        throw createError({
            statusCode: 400,
            message: "UserInfo response missing subject",
        });
    }

    await setUserSession(event, {
        user: {
            id: userId,
        },
    });

    // Authorization is complete; clear the session binding cookie
    deleteCookie(event, "bridge_id");

    const redirect =
        session.post_login_redirect ||
        (getQuery(event).redirect as string | undefined) ||
        "/dashboard";
    await sendRedirect(event, redirect, 302);
});

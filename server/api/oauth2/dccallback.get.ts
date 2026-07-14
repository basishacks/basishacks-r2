import { jwtVerify } from "jose";
import { exchangeAuthorizationCode, getAuthorizeSession } from "./session.post";
import { applyRateLimit, AUTH_RATE_LIMIT_CONFIG } from "~~/server/utils/rateLimit";

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
export default defineEventHandler(
    applyRateLimit(async (event) => {
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

        let result: string;
        try {
            result = await exchangeAuthorizationCode(
                getQuery(event).code as string,
                session.application.client_id,
                session.redirect_uri,
                session.scopes.join(" "),
                pkceVerifier,
            );
        } catch (e: any) {
            throw createError({
                statusCode: 400,
                message: "invalid_grant: " + e.message,
            });
        }
        // Clear the PKCE verifier cookie now that it's been used
        deleteCookie(event, "pkce_verifier");
        // this function can be used externally like in another website

        const secret = process.env.NUXT_OAUTH2_JWT_SECRET;
        if (!secret) {
            throw new Error("NUXT_OAUTH2_JWT_SECRET is not set");
        }

        const { payload } = await jwtVerify(result, new TextEncoder().encode(secret));
        const userId = Number(payload.user_id);

        await setUserSession(event, {
            user: {
                id: userId,
                token: payload,
                token_raw: result,
            },
        });

        // Authorization is complete; clear the session binding cookie
        deleteCookie(event, "bridge_id");

        // Use session-level redirect if set, else fall back to query param or default
        const redirect =
            session.post_login_redirect ||
            (getQuery(event).redirect as string | undefined) ||
            "/dashboard";
        await sendRedirect(event, redirect, 302);
    }, AUTH_RATE_LIMIT_CONFIG),
);
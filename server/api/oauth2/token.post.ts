/*
 * OAuth2 Token Endpoint
 *
 * Exchanges an authorization code for a JWT access token.
 * Accepts application/x-www-form-urlencoded (standard) and JSON request bodies.
 *
 * External clients must use this HTTP endpoint. First-party onsite login calls
 * the same logic via issueOAuth2AccessToken / redeemAuthorizationCodeForToken
 * in server/utils/oauth2-token.ts (no self-HTTP).
 */
import { issueOAuth2AccessToken } from "~~/server/utils/oauth2-token";
import { OAuth2TokenRequest } from "~~/shared/schemas";
import { applyRateLimit, AUTH_RATE_LIMIT_CONFIG } from "~~/server/utils/rateLimit";

export default defineEventHandler(
    applyRateLimit(async (event) => {
        console.log("[Authorize -> OAuth2] Token endpoint hit");

        const contentType = getRequestHeader(event, "content-type") || "";

        let rawBody: any;
        if (contentType.includes("application/x-www-form-urlencoded")) {
            const text = await readRawBody(event);
            rawBody = Object.fromEntries(new URLSearchParams(text));
        } else {
            rawBody = await readBody(event);
        }

    let body: OAuth2TokenRequest;
    try {
        body = await OAuth2TokenRequest.parseAsync(rawBody);
    } catch (err: any) {
        const issues = err.issues?.map((i: any) => i.message).join(", ");
        const message = issues || err.message || "Invalid request";
        throw createError({
            statusCode: 400,
            statusMessage: "invalid_request",
            message,
        });
    }

    return await issueOAuth2AccessToken(event, {
        code: body.code,
        clientId: body.client_id,
        clientSecret: body.client_secret,
        redirectUri: body.redirect_uri,
        codeVerifier: body.code_verifier,
    });
    }, AUTH_RATE_LIMIT_CONFIG),
);

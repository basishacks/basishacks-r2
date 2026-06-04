import { defineEventHandler } from "h3";
import { randomBytes } from "node:crypto";
import { validateOAuth2AuthorizationRequest } from "~/../server/utils/oauth2-validate";
import type { AuthorizeSession } from "../api/oauth2/session.post";
import {
    addAuthorizeSession,
    attachAuthorizeSessionCookie,
    completeAuthorizeSession,
    constructSession,
    getAuthorizeSession,
} from "../api/oauth2/session.post";
import { generateMicrosoftOAuth2Link } from "../api/oauth2/to_microsoft.post";

/**
 * OAuth2 Authorization Middleware
 * Validates client_id and requested scopes for OAuth2 authorization flow
 * Similar to the validation in authorize.vue page
 */
export default defineEventHandler(async (event) => {
    // Only validate authorize routes
    if (!event.node.req.url?.includes("/api/oauth2/authorize")) {
        return;
    }

    const query = getQuery(event);
    const client_id = query.client_id as string;
    const scope = query.scope as string;
    const state = query.state as string;
    const response_type = query.response_type as string;
    const code_challenge = query.code_challenge as string;
    const code_challenge_method = query.code_challenge_method as string;
    const redirect_uri = query.redirect_uri as string | undefined;

    const currentBridgeId = getCookie(event, "bridge_id");
    if (currentBridgeId) {
        const currentSession = getAuthorizeSession(currentBridgeId || "");

        if (!currentSession) {
            console.log(
                "[Authorization -> OAuth2] No session found for bridge_id " +
                    currentBridgeId.substring(0, 16) +
                    "..., starting new authorization",
            );
        } else if (
            currentSession.application.client_id != client_id ||
            encodeURI(currentSession.scopes.join(" ")) != encodeURI(decodeURI(scope)) || // ensure only encoded ONCE
            currentSession.redirect_uri != redirect_uri ||
            currentSession.bh_state != state
        ) {
            console.log(
                "[Authorization -> OAuth2] Existing session found for bridge_id " +
                    currentBridgeId.substring(0, 16) +
                    "... failed parameter check. new session...",
            );
        } else if (
            currentSession.login_state == "identification" ||
            currentSession.login_state == "consent"
        ) {
            // security: refresh must gaurentee login flow from the top
            console.log(
                "[Authorization -> OAuth2] Existing session found for bridge_id " +
                    currentBridgeId.substring(0, 16) +
                    "... skipping new authorization and refreshing",
            );
            attachAuthorizeSessionCookie(currentSession, event);
            currentSession.expire_time = Date.now() + 10 * 60 * 1000; // Extend session for another 10 mins
            return; // here
        }
        console.log(
            "[Authorization -> OAuth2] Existing session found for bridge_id " +
                currentBridgeId.substring(0, 16) +
                "... but invalid login state " +
                currentSession?.login_state +
                " or session null, starting new authorization",
        );

        completeAuthorizeSession(currentBridgeId); // if using old session this will not be hit bc of prev return func
    }

    try {
        const validatedRequest = await validateOAuth2AuthorizationRequest(
            event,
            client_id,
            scope,
            redirect_uri || "",
            query.state as string,
            query.response_type as string,
            query.code_challenge as string,
            query.code_challenge_method as string,
        );

        const app: OAuth2Application = validatedRequest?.app as OAuth2Application;

        const session: AuthorizeSession = constructSession(
            redirect_uri || "",
            app,
            query.state as string,
            query.code_challenge as string,
            query.code_challenge_method as string,
            query.scope as string,
        );

        addAuthorizeSession(session);

        attachAuthorizeSessionCookie(session, event);

        if (app.proxy_microsoft) {
            // instant redirect mode, skip basishacks login
            const link = generateMicrosoftOAuth2Link(session);
            session.login_state = "requesting";

            console.log("[Authorization -> OAuth2] Microsoft proxy application " + app.client_id);

            return sendRedirect(event, link);
        }
    } catch (err: any) {
        console.warn(
            "[Authorization -> OAuth2] User requested faulty oauth link:",
            err.message || err,
        );
        // throw createError({
        //   statusCode: err.statusCode || 400,
        //   message: err.message || 'Invalid OAuth2 authorization request',
        // })
        // Not throwing any error here, because it will show the default error page but
        // not the one in OAuth login

        const payload = {
            message: err.message,
        };

        return setCookie(
            event,
            "bridge_error",
            Buffer.from(JSON.stringify(payload)).toString("base64url"),
            {
                maxAge: 10 * 60, // 10 mins
                secure: true,
                sameSite: "lax",
            },
        );
    }
});

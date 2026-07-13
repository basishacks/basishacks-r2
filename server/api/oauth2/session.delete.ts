import { readValidatedBody } from "h3";
import { OAuth2SessionActionRequest } from "~~/shared/schemas";
import {
    completeAuthorizeSession,
    getAuthorizeSession,
    removeIfSessionExpired,
} from "./session.post";
import { applyRateLimit, AUTH_RATE_LIMIT_CONFIG } from "~~/server/utils/rateLimit";

/* Deletes and handles the OAuth2 authorize session */
export default defineEventHandler(
    applyRateLimit(async (event) => {
        const body = await readValidatedBody(event, OAuth2SessionActionRequest.parse);

        const sessid = getCookie(event, "bridge_id");

        if (!sessid) {
            // No session ID found in cookies
            throw createError({
                statusCode: 400,
                message: "Cookie 'bridge_id' is required",
            });
        }

        const session = getAuthorizeSession(sessid);

        if (!session) {
            throw createError({
                statusCode: 400,
                message: "session_expired",
            });
        }

        if (removeIfSessionExpired(session)) {
            throw createError({
                statusCode: 400,
                message: "session_expired",
            });
        }

        let message: string;
        let redir: string;

        if (body.action === "cancel" || body.action === "deny") {
            message =
                body.action === "cancel"
                    ? "User cancelled authorization request"
                    : "User denied authorization request";

            deleteCookie(event, "bridge_id"); // ensure session cookie is removed on cancel/deny
            session.login_state = "completed"; // mark session as completed to prevent reuse, even though it will be deleted on next auth attempt

            redir =
                session.redirect_uri +
                "?error=access_denied&error_description=" +
                encodeURI(message) +
                "&state=" +
                session.bh_state;
        } else {
            // consent
            redir = completeConsentFlow(event, session);
        }

        return {
            redirect_to: redir,
        };
    }, AUTH_RATE_LIMIT_CONFIG),
);

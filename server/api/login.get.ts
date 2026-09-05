import { applyRateLimit, AUTH_RATE_LIMIT_CONFIG } from "~~/server/utils/rateLimit";
import {
    beginBasisAuthFlow,
    getBasisAuthFlowSession,
    sanitizePostLoginRedirect,
} from "~~/server/utils/basis-auth";
import { getPublicOrigin } from "~~/server/utils/oauth2";

export default defineEventHandler(
    applyRateLimit(async (event) => {
        const redirect = sanitizePostLoginRedirect(getQuery(event).redirect as string | undefined);
        // ponytail: flow cookie is host-only; bounce to the canonical host first
        // or the callback lands on another host without the transaction (401).
        if (getRequestURL(event).hostname !== new URL(getPublicOrigin()).hostname) {
            const canonical = new URL("/api/login", getPublicOrigin());
            if (redirect) canonical.searchParams.set("redirect", redirect);
            return await sendRedirect(event, canonical.href, 302);
        }
        const flow = await getBasisAuthFlowSession(event);
        const authorizationUrl = await beginBasisAuthFlow(redirect);

        await flow.update(authorizationUrl.transaction);
        return await sendRedirect(event, authorizationUrl.url.href, 302);
    }, AUTH_RATE_LIMIT_CONFIG),
);

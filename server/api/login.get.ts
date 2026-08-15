import { applyRateLimit, AUTH_RATE_LIMIT_CONFIG } from "~~/server/utils/rateLimit";
import {
    beginBasisAuthFlow,
    getBasisAuthFlowSession,
    sanitizePostLoginRedirect,
} from "~~/server/utils/basis-auth";

export default defineEventHandler(
    applyRateLimit(async (event) => {
        const redirect = sanitizePostLoginRedirect(getQuery(event).redirect as string | undefined);
        const flow = await getBasisAuthFlowSession(event);
        const authorizationUrl = await beginBasisAuthFlow(redirect);

        await flow.update(authorizationUrl.transaction);
        return await sendRedirect(event, authorizationUrl.url.href, 302);
    }, AUTH_RATE_LIMIT_CONFIG),
);

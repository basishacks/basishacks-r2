import { applyRateLimit, AUTH_RATE_LIMIT_CONFIG } from "~~/server/utils/rateLimit";
import { completeBasisAuthFlow, getBasisAuthFlowSession } from "~~/server/utils/basis-auth";
import { findOrLinkBasisAuthUser } from "~~/server/utils/database/users";

export default defineEventHandler(
    applyRateLimit(async (event) => {
        const flow = await getBasisAuthFlowSession(event);
        const transaction = { ...flow.data };
        await flow.clear();

        try {
            const identity = await completeBasisAuthFlow(getRequestURL(event), transaction);
            const user = await findOrLinkBasisAuthUser(event, identity);

            await replaceUserSession(event, { user: { id: user.id } });
            return await sendRedirect(event, transaction.postLoginRedirect || "/dashboard", 302);
        } catch (error) {
            console.error("basis-auth callback failed", error);
            throw createError({
                statusCode: 401,
                statusMessage: "Authentication failed",
                message: "Unable to complete login. Please try again.",
            });
        }
    }, AUTH_RATE_LIMIT_CONFIG),
);

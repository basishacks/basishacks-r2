import { applyRateLimit, AUTH_RATE_LIMIT_CONFIG } from "~~/server/utils/rateLimit";
import { completeBasisAuthFlow, getBasisAuthFlowSession } from "~~/server/utils/basis-auth";
import { findOrLinkBasisAuthUser } from "~~/server/utils/database/users";

export default defineEventHandler(
    applyRateLimit(async (event) => {
        const flow = await getBasisAuthFlowSession(event);
        const transaction = { ...flow.data };
        await flow.clear();

        // ponytail: user denied access at the provider, redirect home instead of 401
        if (typeof getQuery(event).error === "string") {
            return await sendRedirect(event, transaction.postLoginRedirect || "/", 302);
        }

        try {
            const identity = await completeBasisAuthFlow(getRequestURL(event), transaction);
            const user = await findOrLinkBasisAuthUser(event, identity);

            await replaceUserSession(event, { user: { id: user.id } });
            return await sendRedirect(event, transaction.postLoginRedirect || "/dashboard", 302);
        } catch (error) {
            console.error("basis-auth callback failed", error);
            // ponytail: keep real statuses (403 unverified, 409 conflict), 401 only the rest
            const status =
                typeof error === "object" && error !== null
                    ? ((error as { statusCode?: unknown }).statusCode ??
                      (error as { status?: unknown }).status)
                    : undefined;
            if (typeof status === "number" && status >= 400 && status < 600) throw error;
            throw createError({
                statusCode: 401,
                statusMessage: "Authentication failed",
                message: "Unable to complete login. Please try again.",
            });
        }
    }, AUTH_RATE_LIMIT_CONFIG),
);

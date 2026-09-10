import { revokeBasisAuthToken } from "~~/server/utils/basis-auth";
import { applyRateLimit, AUTH_RATE_LIMIT_CONFIG } from "~~/server/utils/rateLimit";

export default defineEventHandler(
    applyRateLimit(async (event) => {
        const session = await getUserSession(event);
        try {
            if (session.secure?.refreshToken) {
                await revokeBasisAuthToken(session.secure.refreshToken);
            }
        } catch (error) {
            console.warn("basis-auth token revocation failed", error);
        } finally {
            await clearUserSession(event);
        }
        return { loggedOut: true };
    }, AUTH_RATE_LIMIT_CONFIG),
);

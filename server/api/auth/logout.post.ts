import { revokeBasisAuthToken } from "~~/server/utils/basis-auth";
import { applyRateLimit, AUTH_RATE_LIMIT_CONFIG } from "~~/server/utils/rateLimit";
import {
    deleteBasisAuthSession,
    getBasisAuthSession,
} from "~~/server/utils/database/basis-auth-sessions";

export default defineEventHandler(
    applyRateLimit(async (event) => {
        const session = await getUserSession(event);
        try {
            const tokens = session.user?.id
                ? getBasisAuthSession(event, session.id, session.user.id)
                : undefined;
            if (tokens?.refreshToken) {
                await revokeBasisAuthToken(tokens.refreshToken);
            }
        } catch (error) {
            console.warn("basis-auth token revocation failed", error);
        } finally {
            try {
                deleteBasisAuthSession(event, session.id);
            } finally {
                await clearUserSession(event);
            }
        }
        return { loggedOut: true };
    }, AUTH_RATE_LIMIT_CONFIG),
);

import { APIError } from "@basis/schema/api";
import { refreshBasisAuthTokens } from "~~/server/utils/basis-auth";
import { applyRateLimit, AUTH_RATE_LIMIT_CONFIG } from "~~/server/utils/rateLimit";

const REFRESH_BUFFER_MS = 30_000;
const refreshes = new Map<string, Promise<Awaited<ReturnType<typeof getUserSession>>>>();

export default defineEventHandler(
    applyRateLimit(async (event) => {
        let session = await getUserSession(event);
        if (!session.user?.id || !session.secure?.refreshToken) {
            throw new APIError("invalid_token", "Authentication is required", 401);
        }

        if (
            session.secure.accessToken &&
            session.secure.accessTokenExpiresAt > Date.now() + REFRESH_BUFFER_MS
        ) {
            return {
                accessToken: session.secure.accessToken,
                expiresAt: session.secure.accessTokenExpiresAt,
            };
        }

        let pending = refreshes.get(session.id);
        if (!pending) {
            pending = (async () => {
                try {
                    const tokens = await refreshBasisAuthTokens(session.secure!.refreshToken);
                    return await replaceUserSession(event, {
                        user: session.user,
                        secure: {
                            accessToken: tokens.accessToken,
                            accessTokenExpiresAt: tokens.expiresAt,
                            refreshToken: tokens.refreshToken,
                            scopes: tokens.scopes,
                        },
                    });
                } catch {
                    await clearUserSession(event);
                    throw new APIError("invalid_token", "The login session has expired", 401);
                } finally {
                    refreshes.delete(session.id);
                }
            })();
            refreshes.set(session.id, pending);
        }

        session = await pending;
        return {
            accessToken: session.secure!.accessToken,
            expiresAt: session.secure!.accessTokenExpiresAt,
        };
    }, AUTH_RATE_LIMIT_CONFIG),
);

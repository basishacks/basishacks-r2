import { APIError } from "@basis/schema/api";
import { refreshBasisAuthTokens } from "~~/server/utils/basis-auth";
import { applyRateLimit, AUTH_RATE_LIMIT_CONFIG } from "~~/server/utils/rateLimit";
import { decodeJwt } from "jose";
import {
    deleteBasisAuthSession,
    getBasisAuthSession,
    saveBasisAuthSession,
    type StoredBasisAuthTokens,
} from "~~/server/utils/database/basis-auth-sessions";

const REFRESH_BUFFER_MS = 30_000;
const refreshes = new Map<string, Promise<StoredBasisAuthTokens>>();

export default defineEventHandler(
    applyRateLimit(async (event) => {
        const session = await getUserSession(event);
        if (!session.user?.id) {
            throw new APIError("invalid_token", "Authentication is required", 401);
        }
        let tokens: StoredBasisAuthTokens | undefined;
        try {
            tokens = getBasisAuthSession(event, session.id, session.user.id);
        } catch {
            try {
                deleteBasisAuthSession(event, session.id);
            } catch {
                // Clearing the browser session below is the critical cleanup.
            }
        }
        if (!tokens) {
            await clearUserSession(event);
            throw new APIError("invalid_token", "The login session has expired", 401);
        }
        const currentTokens = tokens;
        const userId = session.user.id;

        if (currentTokens.accessTokenExpiresAt > Date.now() + REFRESH_BUFFER_MS) {
            return {
                accessToken: currentTokens.accessToken,
                expiresAt: currentTokens.accessTokenExpiresAt,
                permissions: readTokenPermissions(currentTokens.accessToken),
            };
        }

        let pending = refreshes.get(session.id);
        if (!pending) {
            pending = (async () => {
                try {
                    const refreshed = await refreshBasisAuthTokens(currentTokens.refreshToken);
                    const updated = {
                        accessToken: refreshed.accessToken,
                        accessTokenExpiresAt: refreshed.expiresAt,
                        refreshToken: refreshed.refreshToken,
                    };
                    saveBasisAuthSession(event, session.id, userId, updated);
                    return updated;
                } catch {
                    await clearUserSession(event);
                    try {
                        deleteBasisAuthSession(event, session.id);
                    } catch {
                        // The invalid browser session has already been cleared.
                    }
                    throw new APIError("invalid_token", "The login session has expired", 401);
                } finally {
                    refreshes.delete(session.id);
                }
            })();
            refreshes.set(session.id, pending);
        }

        tokens = await pending;
        return {
            accessToken: tokens.accessToken,
            expiresAt: tokens.accessTokenExpiresAt,
            permissions: readTokenPermissions(tokens.accessToken),
        };
    }, AUTH_RATE_LIMIT_CONFIG),
);

/** The browser receives permissions only for UI display; APIs verify the JWT independently. */
function readTokenPermissions(accessToken: string): string[] {
    try {
        const permissions = decodeJwt(accessToken).permissions;
        return Array.isArray(permissions) && permissions.every((value) => typeof value === "string")
            ? permissions
            : [];
    } catch {
        return [];
    }
}

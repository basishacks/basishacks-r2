import { beforeEach, describe, expect, it } from "vitest";
import { createMockEvent } from "./helpers";
import {
    deleteBasisAuthSession,
    getBasisAuthSession,
    saveBasisAuthSession,
} from "~~/server/utils/database/basis-auth-sessions";
import { basisAuthSessions, users } from "~~/server/database/schema";

describe("basis-auth session database helpers", () => {
    let event: Awaited<ReturnType<typeof createMockEvent>>;

    beforeEach(async () => {
        process.env.NUXT_SESSION_PASSWORD = "test-password-that-is-at-least-32-bytes";
        event = await createMockEvent();
        event.context.drizzle.insert(users).values({ id: 7, email: "user@example.com" }).run();
    });

    it("stores encrypted tokens and restores them for the matching session and user", () => {
        const tokens = {
            accessToken: "large.access.token",
            accessTokenExpiresAt: Date.now() + 60_000,
            refreshToken: "refresh-token",
        };

        saveBasisAuthSession(event, "session-1", 7, tokens);

        const row = event.context.drizzle.select().from(basisAuthSessions).get();
        expect(row?.encrypted_tokens).not.toContain(tokens.accessToken);
        expect(row?.encrypted_tokens).not.toContain(tokens.refreshToken);
        expect(getBasisAuthSession(event, "session-1", 7)).toEqual(tokens);
        expect(getBasisAuthSession(event, "session-1", 8)).toBeUndefined();
    });

    it("updates rotated tokens without changing the browser session", () => {
        saveBasisAuthSession(event, "session-1", 7, {
            accessToken: "old-access",
            accessTokenExpiresAt: 1,
            refreshToken: "old-refresh",
        });
        saveBasisAuthSession(event, "session-1", 7, {
            accessToken: "new-access",
            accessTokenExpiresAt: Date.now() + 60_000,
            refreshToken: "new-refresh",
        });

        expect(getBasisAuthSession(event, "session-1", 7)).toMatchObject({
            accessToken: "new-access",
            refreshToken: "new-refresh",
        });
        expect(event.context.drizzle.select().from(basisAuthSessions).all()).toHaveLength(1);
    });

    it("deletes token state on logout", () => {
        saveBasisAuthSession(event, "session-1", 7, {
            accessToken: "access",
            accessTokenExpiresAt: Date.now() + 60_000,
            refreshToken: "refresh",
        });

        deleteBasisAuthSession(event, "session-1");

        expect(getBasisAuthSession(event, "session-1", 7)).toBeUndefined();
    });
});

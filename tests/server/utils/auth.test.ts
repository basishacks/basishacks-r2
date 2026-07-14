import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockEvent } from "./database/helpers";
import { requireUser, requireJudge, requireAdmin, requirePermission } from "~~/server/utils/auth";
import { getUser } from "~~/server/utils/database/users";

async function createEvent() {
    const event = await createMockEvent();
    vi.stubGlobal("getUser", getUser);
    return event;
}

describe("server/utils/auth", () => {
    let event: Awaited<ReturnType<typeof createEvent>>;

    beforeEach(async () => {
        event = await createEvent();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe("requireUser", () => {
        it("returns the user when session and database user exist", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO users(id, email, role) VALUES(1, 'user@example.com', 'participant')",
                )
                .run();
            vi.stubGlobal("getUserSession", async () => ({ user: { id: 1 } }));

            const user = await requireUser(event);

            expect(user).not.toBeNull();
            expect(user.id).toBe(1);
            expect(user.email).toBe("user@example.com");
        });

        it("throws 401 when session is missing", async () => {
            vi.stubGlobal("getUserSession", async () => ({}));

            await expect(requireUser(event)).rejects.toMatchObject({
                statusCode: 401,
                message: "Logged in user not found",
            });
        });

        it("throws 401 when session user id is missing", async () => {
            vi.stubGlobal("getUserSession", async () => ({ user: {} }));

            await expect(requireUser(event)).rejects.toMatchObject({
                statusCode: 401,
                message: "Logged in user not found",
            });
        });

        it("throws 401 when database user does not exist", async () => {
            vi.stubGlobal("getUserSession", async () => ({ user: { id: 999 } }));

            await expect(requireUser(event)).rejects.toMatchObject({
                statusCode: 401,
                message: "Logged in user not found",
            });
        });
    });

    describe("requireJudge", () => {
        it("returns the user when role is judge", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO users(id, email, role) VALUES(1, 'judge@example.com', 'judge')",
                )
                .run();
            vi.stubGlobal("getUserSession", async () => ({ user: { id: 1 } }));

            const user = await requireJudge(event);

            expect(user.role).toBe("judge");
        });

        it("returns the user when role is admin", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO users(id, email, role) VALUES(1, 'admin@example.com', 'admin')",
                )
                .run();
            vi.stubGlobal("getUserSession", async () => ({ user: { id: 1 } }));

            const user = await requireJudge(event);

            expect(user.role).toBe("admin");
        });

        it("throws 403 when role is participant", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO users(id, email, role) VALUES(1, 'user@example.com', 'participant')",
                )
                .run();
            vi.stubGlobal("getUserSession", async () => ({ user: { id: 1 } }));

            await expect(requireJudge(event)).rejects.toMatchObject({
                statusCode: 403,
                message: "Insufficient permissions",
            });
        });
    });

    describe("requireAdmin", () => {
        it("returns the user when role is admin", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO users(id, email, role) VALUES(1, 'admin@example.com', 'admin')",
                )
                .run();
            vi.stubGlobal("getUserSession", async () => ({ user: { id: 1 } }));

            const user = await requireAdmin(event);

            expect(user.role).toBe("admin");
        });

        it("throws 403 when role is judge", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO users(id, email, role) VALUES(1, 'judge@example.com', 'judge')",
                )
                .run();
            vi.stubGlobal("getUserSession", async () => ({ user: { id: 1 } }));

            await expect(requireAdmin(event)).rejects.toMatchObject({
                statusCode: 403,
                message: "Insufficient permissions",
            });
        });

        it("throws 403 when role is participant", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO users(id, email, role) VALUES(1, 'user@example.com', 'participant')",
                )
                .run();
            vi.stubGlobal("getUserSession", async () => ({ user: { id: 1 } }));

            await expect(requireAdmin(event)).rejects.toMatchObject({
                statusCode: 403,
                message: "Insufficient permissions",
            });
        });
    });

    describe("requirePermission", () => {
        it("returns the user when role has the required permission", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO users(id, email, role) VALUES(1, 'judge@example.com', 'judge')",
                )
                .run();
            vi.stubGlobal("getUserSession", async () => ({ user: { id: 1 } }));

            const user = await requirePermission(event, "judge");

            expect(user.id).toBe(1);
        });

        it("returns the user when role is admin", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO users(id, email, role) VALUES(1, 'admin@example.com', 'admin')",
                )
                .run();
            vi.stubGlobal("getUserSession", async () => ({ user: { id: 1 } }));

            const user = await requirePermission(event, "judge");

            expect(user.role).toBe("admin");
        });

        it("throws 403 when role lacks the permission and is not admin", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO users(id, email, role) VALUES(1, 'user@example.com', 'participant')",
                )
                .run();
            vi.stubGlobal("getUserSession", async () => ({ user: { id: 1 } }));

            await expect(requirePermission(event, "judge")).rejects.toMatchObject({
                statusCode: 403,
                message: "Insufficient permissions",
            });
        });
    });
});

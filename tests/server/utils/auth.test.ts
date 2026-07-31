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

        it("throws 403 when role is participant requesting admin permission", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO users(id, email, role) VALUES(1, 'user@example.com', 'participant')",
                )
                .run();
            vi.stubGlobal("getUserSession", async () => ({ user: { id: 1 } }));

            await expect(requirePermission(event, "admin")).rejects.toMatchObject({
                statusCode: 403,
                message: "Insufficient permissions",
            });
        });

        it("returns user when participant requests participant permission", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO users(id, email, role) VALUES(1, 'user@example.com', 'participant')",
                )
                .run();
            vi.stubGlobal("getUserSession", async () => ({ user: { id: 1 } }));

            const user = await requirePermission(event, "participant");

            expect(user.id).toBe(1);
        });

        it("allows admin to bypass non-existent permission check (admin role has 'admin' permission)", async () => {
            // The admin role has "admin" permission which bypasses the requirePermission check
            event.context.drizzle
                .prepare(
                    "INSERT INTO users(id, email, role) VALUES(1, 'admin@example.com', 'admin')",
                )
                .run();
            vi.stubGlobal("getUserSession", async () => ({ user: { id: 1 } }));

            const user = await requirePermission(event, "non_existent_permission");

            expect(user.id).toBe(1);
            expect(user.role).toBe("admin");
        });
    });

    // ---------------------------------------------------------------------------
    // Edge cases
    // ---------------------------------------------------------------------------

    describe("edge cases", () => {
        it("throws 401 when session exists but user was deleted from DB", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO users(id, email, role) VALUES(1, 'temp@example.com', 'participant')",
                )
                .run();
            vi.stubGlobal("getUserSession", async () => ({ user: { id: 1 } }));

            // Delete the user from the DB
            event.context.drizzle.prepare("DELETE FROM users WHERE id = 1").run();

            await expect(requireUser(event)).rejects.toMatchObject({
                statusCode: 401,
                message: "Logged in user not found",
            });
        });

        it("throws 401 for requireJudge when session exists but user was deleted", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO users(id, email, role) VALUES(1, 'judge@example.com', 'judge')",
                )
                .run();
            vi.stubGlobal("getUserSession", async () => ({ user: { id: 1 } }));

            event.context.drizzle.prepare("DELETE FROM users WHERE id = 1").run();

            await expect(requireJudge(event)).rejects.toMatchObject({
                statusCode: 401,
                message: "Logged in user not found",
            });
        });

        it("throws 401 for requireAdmin when session exists but user was deleted", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO users(id, email, role) VALUES(1, 'admin@example.com', 'admin')",
                )
                .run();
            vi.stubGlobal("getUserSession", async () => ({ user: { id: 1 } }));

            event.context.drizzle.prepare("DELETE FROM users WHERE id = 1").run();

            await expect(requireAdmin(event)).rejects.toMatchObject({
                statusCode: 401,
                message: "Logged in user not found",
            });
        });

        it("throws 401 for requirePermission when session exists but user was deleted", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO users(id, email, role) VALUES(1, 'admin@example.com', 'admin')",
                )
                .run();
            vi.stubGlobal("getUserSession", async () => ({ user: { id: 1 } }));

            event.context.drizzle.prepare("DELETE FROM users WHERE id = 1").run();

            await expect(requirePermission(event, "admin")).rejects.toMatchObject({
                statusCode: 401,
                message: "Logged in user not found",
            });
        });

        it("throws 401 when session user.id is negative", async () => {
            vi.stubGlobal("getUserSession", async () => ({ user: { id: -1 } }));

            await expect(requireUser(event)).rejects.toMatchObject({
                statusCode: 401,
                message: "Logged in user not found",
            });
        });

        it("throws 401 when session user.id is 0", async () => {
            vi.stubGlobal("getUserSession", async () => ({ user: { id: 0 } }));

            await expect(requireUser(event)).rejects.toMatchObject({
                statusCode: 401,
                message: "Logged in user not found",
            });
        });

        it("throws 401 when getUserSession returns null", async () => {
            vi.stubGlobal("getUserSession", async () => null);

            await expect(requireUser(event)).rejects.toMatchObject({
                statusCode: 401,
                message: "Logged in user not found",
            });
        });

        it("throws 401 when getUserSession returns undefined", async () => {
            vi.stubGlobal("getUserSession", async () => undefined);

            await expect(requireUser(event)).rejects.toMatchObject({
                statusCode: 401,
                message: "Logged in user not found",
            });
        });

        it("throws 401 when session has no user property", async () => {
            vi.stubGlobal("getUserSession", async () => ({ something: "else" }));

            await expect(requireUser(event)).rejects.toMatchObject({
                statusCode: 401,
                message: "Logged in user not found",
            });
        });

        it("throws 401 when getUserSession throws an error", async () => {
            vi.stubGlobal("getUserSession", async () => {
                throw new Error("Session store error");
            });

            await expect(requireUser(event)).rejects.toThrow();
        });

        it("throws 401 for requireJudge when session user.id is 0", async () => {
            vi.stubGlobal("getUserSession", async () => ({ user: { id: 0 } }));

            await expect(requireJudge(event)).rejects.toMatchObject({
                statusCode: 401,
                message: "Logged in user not found",
            });
        });

        it("throws 401 for requireAdmin when getUserSession returns null", async () => {
            vi.stubGlobal("getUserSession", async () => null);

            await expect(requireAdmin(event)).rejects.toMatchObject({
                statusCode: 401,
                message: "Logged in user not found",
            });
        });

        it("throws 401 for requirePermission when session is missing", async () => {
            vi.stubGlobal("getUserSession", async () => ({}));

            await expect(requirePermission(event, "judge")).rejects.toMatchObject({
                statusCode: 401,
                message: "Logged in user not found",
            });
        });

        it("throws 403 when requireAdmin is called with a judge role", async () => {
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

        it("throws 403 for requirePermission when participant requests judge permission", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO users(id, email, role) VALUES(1, 'part@example.com', 'participant')",
                )
                .run();
            vi.stubGlobal("getUserSession", async () => ({ user: { id: 1 } }));

            await expect(requirePermission(event, "judge")).rejects.toMatchObject({
                statusCode: 403,
                message: "Insufficient permissions",
            });
        });

        it("returns user for requirePermission with 'participant' permission on a participant role", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO users(id, email, role) VALUES(1, 'participant@example.com', 'participant')",
                )
                .run();
            vi.stubGlobal("getUserSession", async () => ({ user: { id: 1 } }));

            const user = await requirePermission(event, "participant");
            expect(user.role).toBe("participant");
        });

        it("throws 403 for requireJudge with participant role", async () => {
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

        it("handles multiple users in DB and returns the correct one", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO users(id, email, role) VALUES(1, 'user1@example.com', 'participant')",
                )
                .run();
            event.context.drizzle
                .prepare(
                    "INSERT INTO users(id, email, role) VALUES(2, 'user2@example.com', 'judge')",
                )
                .run();
            vi.stubGlobal("getUserSession", async () => ({ user: { id: 2 } }));

            const user = await requireUser(event);
            expect(user.id).toBe(2);
            expect(user.email).toBe("user2@example.com");
        });

        it("returns the correct user for requireAdmin when multiple users exist", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO users(id, email, role) VALUES(1, 'user@example.com', 'participant')",
                )
                .run();
            event.context.drizzle
                .prepare(
                    "INSERT INTO users(id, email, role) VALUES(2, 'admin@example.com', 'admin')",
                )
                .run();
            vi.stubGlobal("getUserSession", async () => ({ user: { id: 2 } }));

            const user = await requireAdmin(event);
            expect(user.id).toBe(2);
            expect(user.role).toBe("admin");
        });

        it("throws 403 for requireAdmin with judge role from multiple users", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO users(id, email, role) VALUES(1, 'admin@example.com', 'admin')",
                )
                .run();
            event.context.drizzle
                .prepare(
                    "INSERT INTO users(id, email, role) VALUES(2, 'judge@example.com', 'judge')",
                )
                .run();
            vi.stubGlobal("getUserSession", async () => ({ user: { id: 2 } }));

            await expect(requireAdmin(event)).rejects.toMatchObject({
                statusCode: 403,
                message: "Insufficient permissions",
            });
        });

        it("returns user for requirePermission with admin checking admin permission", async () => {
            event.context.drizzle
                .prepare("INSERT INTO users(id, email, role) VALUES(1, 'adm@example.com', 'admin')")
                .run();
            vi.stubGlobal("getUserSession", async () => ({ user: { id: 1 } }));

            const user = await requirePermission(event, "admin");
            expect(user.id).toBe(1);
            expect(user.role).toBe("admin");
        });

        it("throws 401 for requireUser when session has user.id but user not in DB with multiple users", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO users(id, email, role) VALUES(1, 'exists@example.com', 'participant')",
                )
                .run();
            vi.stubGlobal("getUserSession", async () => ({ user: { id: 999 } }));

            await expect(requireUser(event)).rejects.toMatchObject({
                statusCode: 401,
                message: "Logged in user not found",
            });
        });
    });
});

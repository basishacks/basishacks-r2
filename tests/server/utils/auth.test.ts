import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockEvent } from "./database/helpers";
import {
    optionalUser,
    requireAdmin,
    requireJudge,
    requirePermission,
    requireUser,
} from "~~/server/utils/auth";

const payload = {
    iss: "https://auth.example.test",
    sub: "subject-1",
    aud: "devconnect://nethack.bisz.dev",
    exp: Math.floor(Date.now() / 1000) + 300,
    iat: Math.floor(Date.now() / 1000),
    type: "access_token" as const,
    client_id: "basishacks",
    scope: "Profile.all Teams.read.all",
    permissions: [],
};

describe("server/utils/auth bearer authorization", () => {
    let event: Awaited<ReturnType<typeof createMockEvent>>;

    beforeEach(async () => {
        event = await createMockEvent();
        vi.stubGlobal("createError", (input: any) =>
            Object.assign(new Error(input.message), input),
        );
    });

    const authenticate = (role: "participant" | "judge" | "admin") => {
        const user = { id: 1, role, auth_issuer: payload.iss, auth_subject: payload.sub } as any;
        event.context.oauth2 = { payload, scopes: payload.scope.split(" "), user };
        return user;
    };

    it("returns the bearer-linked local user and enforces delegated scope hierarchy", async () => {
        const user = authenticate("participant");

        await expect(requireUser(event, "Profile.read")).resolves.toBe(user);
        await expect(requireUser(event, "Teams.read.self")).resolves.toBe(user);
        expect(event.context.oauth2?.scopes).toEqual(["Profile.all", "Teams.read.all"]);
    });

    it("rejects an insufficient delegated scope", async () => {
        authenticate("participant");

        await expect(requireUser(event, "Projects.write.self")).rejects.toMatchObject({
            statusCode: 403,
            statusMessage: "insufficient_scope",
        });
    });

    it("applies participant, judge, and admin RBAC after scope validation", async () => {
        authenticate("participant");
        await expect(requireJudge(event, "Profile.read")).rejects.toMatchObject({ status: 403 });

        authenticate("judge");
        await expect(requireJudge(event, "Profile.read")).resolves.toMatchObject({ role: "judge" });
        await expect(requireAdmin(event, "Profile.read")).rejects.toMatchObject({ status: 403 });

        authenticate("admin");
        await expect(requireAdmin(event, "Profile.read")).resolves.toMatchObject({ role: "admin" });
    });

    it("keeps fine-grained local role checks in addition to delegated scopes", async () => {
        authenticate("participant");
        await expect(requirePermission(event, "judge", "Profile.read")).rejects.toMatchObject({
            status: 403,
        });

        authenticate("admin");
        await expect(requirePermission(event, "judge", "Profile.read")).resolves.toMatchObject({
            role: "admin",
        });
    });

    it("keeps anonymous reads anonymous when no authorization header is present", async () => {
        vi.stubGlobal("getHeader", () => undefined);

        await expect(optionalUser(event)).resolves.toBeUndefined();
    });

    it("does not consult the Nuxt session when bearer context is present", async () => {
        const session = vi.fn(() => Promise.resolve({ user: { id: 999 } }));
        vi.stubGlobal("getUserSession", session);
        authenticate("participant");

        await requireUser(event, "Profile.read");
        expect(session).not.toHaveBeenCalled();
    });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockEvent } from "./database/helpers";
import { optionalUser, requireUser } from "~~/server/utils/auth";
import { NethackPermissions } from "~~/shared/permissions";

const basePayload = {
    iss: "https://auth.example.test",
    sub: "subject-1",
    aud: "devconnect://nethack.bisz.dev",
    exp: Math.floor(Date.now() / 1000) + 300,
    iat: Math.floor(Date.now() / 1000),
    type: "access_token" as const,
    client_id: "basishacks",
    scope: "openid nethack.access",
    permissions: [] as string[],
};

describe("server/utils/auth bearer authorization", () => {
    let event: Awaited<ReturnType<typeof createMockEvent>>;

    beforeEach(async () => {
        event = await createMockEvent();
        vi.stubGlobal("createError", (input: any) =>
            Object.assign(new Error(input.message), input),
        );
        vi.stubGlobal("getHeader", () => undefined);
        vi.stubGlobal("getCookie", () => undefined);
    });

    const authenticate = (permissions: string[]) => {
        const user = { id: 1, auth_issuer: basePayload.iss, auth_subject: basePayload.sub } as any;
        const payload = { ...basePayload, permissions };
        event.context.oauth2 = { payload, permissions, user };
        return user;
    };

    it("returns the linked local user when the JWT has the required permission", async () => {
        const user = authenticate([NethackPermissions.Profile.updateSelf]);

        await expect(requireUser(event, NethackPermissions.Profile.updateSelf)).resolves.toBe(user);
        expect(event.context.oauth2?.permissions).toEqual([NethackPermissions.Profile.updateSelf]);
    });

    it("rejects a missing delegated permission", async () => {
        authenticate([NethackPermissions.Profile.updateSelf]);

        await expect(
            requireUser(event, NethackPermissions.Projects.submitOwn),
        ).rejects.toMatchObject({
            statusCode: 403,
            statusMessage: "insufficient_permission",
        });
    });

    it("expands legacy role grants from the access token", async () => {
        authenticate(["judge"]);

        await expect(
            requireUser(event, NethackPermissions.Judging.assignmentsRead),
        ).resolves.toMatchObject({ id: 1 });
        expect(event.context.oauth2?.permissions).toContain(
            NethackPermissions.Judging.assignmentsRead,
        );
    });

    it("keeps anonymous reads anonymous when neither bearer nor session cookie exists", async () => {
        await expect(optionalUser(event)).resolves.toBeUndefined();
    });

    it("reuses an already verified bearer context", async () => {
        authenticate([NethackPermissions.Teams.list]);

        await expect(requireUser(event, NethackPermissions.Teams.list)).resolves.toMatchObject({
            id: 1,
        });
    });
});

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import {
    createTestContext,
    resetTestContext,
    resetMockState,
    setupNitroGlobals,
    mockBody,
    mockParams,
    seedHackathon,
    seedSeason,
    seedUser,
    type TestContext,
} from "~~/tests/api/helpers";
import { oauth2Applications } from "~~/server/database/schema";
import { eq } from "drizzle-orm";

let ctx: TestContext;
let handler: any;

beforeAll(async () => {
    setupNitroGlobals();

    const oauthDb = await import("~~/server/utils/database/oauth2_applications");
    vi.stubGlobal("getOAuth2Application", oauthDb.getOAuth2Application);
    vi.stubGlobal("removeOAuth2ApplicationSecret", oauthDb.removeOAuth2ApplicationSecret);

    handler = (await import("~~/server/api/applications/[id]/secrets/index.delete")).default;
});

beforeEach(async () => {
    resetMockState();
    ctx = await createTestContext();
    seedHackathon(ctx);
    seedSeason(ctx);
});

afterEach(() => {
    resetTestContext(ctx);
});

function createEvent(overrides: Record<string, unknown> = {}) {
    return {
        context: { drizzle: ctx.drizzle },
        ...overrides,
    };
}

describe("DELETE /api/applications/[id]/secrets", () => {
    async function seedAppWithSecret(
        user: any,
        rawHex: string,
    ): Promise<{ app: any; clientId: string; abbreviated: string }> {
        const oauthDb = await import("~~/server/utils/database/oauth2_applications");
        const app = await oauthDb.createOAuth2Application(
            { context: { drizzle: ctx.drizzle } } as any,
            user.id,
            "Secret App",
            null,
            false,
            "third",
        );

        const { createHash } = await import("node:crypto");
        const hash = createHash("sha256").update(rawHex).digest("hex");
        ctx.drizzle
            .update(oauth2Applications)
            .set({ client_secret: hash })
            .where(eq(oauth2Applications.client_id, app.client_id))
            .run();

        const abbreviated = `sha256:${hash.slice(0, 8)}...${hash.slice(-8)}`;
        return { app, clientId: app.client_id, abbreviated };
    }

    it("deletes a secret and returns a success message", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        vi.mocked(globalThis.requireUser).mockResolvedValue(user);

        const { clientId, abbreviated } = await seedAppWithSecret(user, "a".repeat(64));

        mockParams.values = { id: clientId };
        mockBody.value = { abbreviated };

        const result = await handler(createEvent());

        expect(result).toEqual({ message: "Secret deleted" });

        const stored = ctx.drizzle
            .select()
            .from(oauth2Applications)
            .where(eq(oauth2Applications.client_id, clientId))
            .get();
        expect(stored!.client_secret).toBe("");
    });

    it("removes only the specified secret when multiple exist", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        vi.mocked(globalThis.requireUser).mockResolvedValue(user);

        const { createHash } = await import("node:crypto");
        const hashA = createHash("sha256").update("a".repeat(64)).digest("hex");
        const hashB = createHash("sha256").update("b".repeat(64)).digest("hex");

        const oauthDb = await import("~~/server/utils/database/oauth2_applications");
        const app = await oauthDb.createOAuth2Application(
            { context: { drizzle: ctx.drizzle } } as any,
            user.id,
            "Multi Secret App",
            null,
            false,
            "third",
        );
        ctx.drizzle
            .update(oauth2Applications)
            .set({ client_secret: `${hashA} ${hashB}` })
            .where(eq(oauth2Applications.client_id, app.client_id))
            .run();

        const abbreviatedA = `sha256:${hashA.slice(0, 8)}...${hashA.slice(-8)}`;
        mockParams.values = { id: app.client_id };
        mockBody.value = { abbreviated: abbreviatedA };

        await handler(createEvent());

        const stored = ctx.drizzle
            .select()
            .from(oauth2Applications)
            .where(eq(oauth2Applications.client_id, app.client_id))
            .get();
        expect(stored!.client_secret).toBe(hashB);
    });

    it("returns 401 when not authenticated", async () => {
        vi.mocked(globalThis.requireUser).mockRejectedValue(
            Object.assign(new Error("Unauthorized"), { statusCode: 401 }),
        );

        mockParams.values = { id: "some-client-id" };
        mockBody.value = { abbreviated: "sha256:aaaaaaaa...aaaaaaaa" };

        await expect(handler(createEvent())).rejects.toMatchObject({ statusCode: 401 });
    });

    it("returns 404 when the application does not exist", async () => {
        const user = seedUser(ctx, { email: "user@basischina.com", role: "admin" });
        vi.mocked(globalThis.requireUser).mockResolvedValue(user);

        mockParams.values = { id: "nonexistent-client-id" };
        mockBody.value = { abbreviated: "sha256:aaaaaaaa...aaaaaaaa" };

        await expect(handler(createEvent())).rejects.toMatchObject({ statusCode: 404 });
    });

    it("returns 403 when the caller is neither owner nor admin", async () => {
        const owner = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const other = seedUser(ctx, { email: "other@basischina.com", role: "participant" });
        vi.mocked(globalThis.requireUser).mockResolvedValue(other);

        const oauthDb = await import("~~/server/utils/database/oauth2_applications");
        const app = await oauthDb.createOAuth2Application(
            { context: { drizzle: ctx.drizzle } } as any,
            owner.id,
            "Private App",
            null,
            false,
            "third",
        );

        mockParams.values = { id: app.client_id };
        mockBody.value = { abbreviated: "sha256:aaaaaaaa...aaaaaaaa" };

        await expect(handler(createEvent())).rejects.toMatchObject({ statusCode: 403 });
    });

    it("allows admin to delete a secret from any application", async () => {
        const owner = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const admin = seedUser(ctx, { email: "admin@basischina.com", role: "admin" });
        vi.mocked(globalThis.requireUser).mockResolvedValue(admin);

        const { clientId, abbreviated } = await seedAppWithSecret(owner, "a".repeat(64));

        mockParams.values = { id: clientId };
        mockBody.value = { abbreviated };

        const result = await handler(createEvent());
        expect(result).toEqual({ message: "Secret deleted" });
    });

    it("returns 400 when abbreviated is an empty string", async () => {
        const user = seedUser(ctx, { email: "admin@basischina.com", role: "admin" });
        vi.mocked(globalThis.requireUser).mockResolvedValue(user);

        mockParams.values = { id: "some-client-id" };
        mockBody.value = { abbreviated: "" };

        await expect(handler(createEvent())).rejects.toThrow();
    });

    it("returns 400 when abbreviated exceeds maximum length", async () => {
        const user = seedUser(ctx, { email: "admin@basischina.com", role: "admin" });
        vi.mocked(globalThis.requireUser).mockResolvedValue(user);

        mockParams.values = { id: "some-client-id" };
        mockBody.value = { abbreviated: "s".repeat(17) };

        await expect(handler(createEvent())).rejects.toThrow();
    });

    it("returns 400 when abbreviated has an invalid format", async () => {
        const user = seedUser(ctx, { email: "admin@basischina.com", role: "admin" });
        vi.mocked(globalThis.requireUser).mockResolvedValue(user);

        const oauthDb = await import("~~/server/utils/database/oauth2_applications");
        const app = await oauthDb.createOAuth2Application(
            { context: { drizzle: ctx.drizzle } } as any,
            user.id,
            "App",
            null,
            false,
            "third",
        );
        // Seed a valid secret so we pass the "no secrets" check
        ctx.drizzle
            .update(oauth2Applications)
            .set({ client_secret: "a".repeat(64) })
            .where(eq(oauth2Applications.client_id, app.client_id))
            .run();

        mockParams.values = { id: app.client_id };
        mockBody.value = { abbreviated: "bad-format" };

        await expect(handler(createEvent())).rejects.toMatchObject({ statusCode: 400 });
    });
});

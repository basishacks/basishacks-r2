import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import {
    createTestContext,
    resetTestContext,
    resetMockState,
    setupNitroGlobals,
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
    vi.stubGlobal(
        "getOAuth2ApplicationSecretAbbreviated",
        oauthDb.getOAuth2ApplicationSecretAbbreviated,
    );

    handler = (await import("~~/server/api/applications/[id]/secrets/index.get")).default;
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

describe("GET /api/applications/[id]/secrets", () => {
    it("returns abbreviated secrets for the owner", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        vi.mocked(globalThis.requireUser).mockResolvedValue(user);

        const { createHash } = await import("node:crypto");
        const hash = createHash("sha256").update("a".repeat(64)).digest("hex");

        const oauthDb = await import("~~/server/utils/database/oauth2_applications");
        const app = await oauthDb.createOAuth2Application(
            { context: { drizzle: ctx.drizzle } } as any,
            user.id,
            "Secret App",
            null,
            false,
            "third",
        );
        ctx.drizzle
            .update(oauth2Applications)
            .set({ client_secret: hash })
            .where(eq(oauth2Applications.client_id, app.client_id))
            .run();

        mockParams.values = { id: app.client_id };

        const result = await handler(createEvent());

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty("abbreviated");
        expect(result[0].abbreviated).toMatch(/^sha256:[a-f0-9]{8}\.\.\.[a-f0-9]{8}$/);
    });

    it("returns multiple abbreviated secrets when multiple exist", async () => {
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

        mockParams.values = { id: app.client_id };

        const result = await handler(createEvent());

        expect(result).toHaveLength(2);
        expect(result[0].abbreviated).toMatch(/^sha256:[a-f0-9]{8}\.\.\.[a-f0-9]{8}$/);
        expect(result[1].abbreviated).toMatch(/^sha256:[a-f0-9]{8}\.\.\.[a-f0-9]{8}$/);
    });

    it("returns an empty array when the application has no secrets", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        vi.mocked(globalThis.requireUser).mockResolvedValue(user);

        const oauthDb = await import("~~/server/utils/database/oauth2_applications");
        const app = await oauthDb.createOAuth2Application(
            { context: { drizzle: ctx.drizzle } } as any,
            user.id,
            "No Secret App",
            null,
            false,
            "third",
        );

        mockParams.values = { id: app.client_id };

        const result = await handler(createEvent());

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(0);
    });

    it("returns 401 when not authenticated", async () => {
        vi.mocked(globalThis.requireUser).mockRejectedValue(
            Object.assign(new Error("Unauthorized"), { statusCode: 401 }),
        );

        mockParams.values = { id: "some-client-id" };

        await expect(handler(createEvent())).rejects.toMatchObject({ statusCode: 401 });
    });

    it("returns 404 when the application does not exist", async () => {
        const user = seedUser(ctx, { email: "user@basischina.com", role: "admin" });
        vi.mocked(globalThis.requireUser).mockResolvedValue(user);

        mockParams.values = { id: "nonexistent-client-id" };

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

        await expect(handler(createEvent())).rejects.toMatchObject({ statusCode: 403 });
    });

    it("allows admin to view secrets of any application", async () => {
        const owner = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const admin = seedUser(ctx, { email: "admin@basischina.com", role: "admin" });
        vi.mocked(globalThis.requireUser).mockResolvedValue(admin);

        const { createHash } = await import("node:crypto");
        const hash = createHash("sha256").update("a".repeat(64)).digest("hex");

        const oauthDb = await import("~~/server/utils/database/oauth2_applications");
        const app = await oauthDb.createOAuth2Application(
            { context: { drizzle: ctx.drizzle } } as any,
            owner.id,
            "Admin Viewable App",
            null,
            false,
            "third",
        );
        ctx.drizzle
            .update(oauth2Applications)
            .set({ client_secret: hash })
            .where(eq(oauth2Applications.client_id, app.client_id))
            .run();

        mockParams.values = { id: app.client_id };

        const result = await handler(createEvent());
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(1);
    });

    it("returns 400 when the route param id is empty", async () => {
        const user = seedUser(ctx, { email: "user@basischina.com", role: "admin" });
        vi.mocked(globalThis.requireUser).mockResolvedValue(user);

        mockParams.values = { id: "" };

        await expect(handler(createEvent())).rejects.toThrow();
    });
});

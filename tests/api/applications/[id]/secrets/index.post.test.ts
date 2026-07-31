import { describe, it, expect, vi, beforeAll, beforeEach, afterAll, afterEach } from "vitest";
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

vi.mock("~~/server/utils/rateLimit", () => ({
    applyRateLimit: (fn: any) => fn,
    DEFAULT_RATE_LIMIT_CONFIG: { maxRequests: 6000, windowMs: 60 * 1000 },
}));

let ctx: TestContext;
let handler: any;

beforeAll(async () => {
    setupNitroGlobals();

    const oauthDb = await import("~~/server/utils/database/oauth2_applications");
    vi.stubGlobal("getOAuth2Application", oauthDb.getOAuth2Application);
    vi.stubGlobal("addOAuth2ApplicationSecret", oauthDb.addOAuth2ApplicationSecret);

    handler = (await import("~~/server/api/applications/[id]/secrets/index.post")).default;
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

describe("POST /api/applications/[id]/secrets", () => {
    it("creates a secret and returns the plaintext", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        vi.mocked(globalThis.requireUser).mockResolvedValue(user);

        const oauthDb = await import("~~/server/utils/database/oauth2_applications");
        const app = await oauthDb.createOAuth2Application(
            { context: { drizzle: ctx.drizzle } } as any,
            user.id,
            "My App",
            null,
            false,
            "third",
        );

        mockParams.values = { id: app.client_id };

        const result = await handler(createEvent());

        expect(result).toHaveProperty("plain_secret");
        expect(typeof result.plain_secret).toBe("string");
        expect(result.plain_secret.length).toBe(64);
    });

    it("stores a SHA-256 hash of the secret in the database", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        vi.mocked(globalThis.requireUser).mockResolvedValue(user);

        const oauthDb = await import("~~/server/utils/database/oauth2_applications");
        const app = await oauthDb.createOAuth2Application(
            { context: { drizzle: ctx.drizzle } } as any,
            user.id,
            "My App",
            null,
            false,
            "third",
        );

        mockParams.values = { id: app.client_id };

        const result = await handler(createEvent());

        const stored = ctx.drizzle
            .select()
            .from(oauth2Applications)
            .where(eq(oauth2Applications.client_id, app.client_id))
            .get();
        expect(stored!.client_secret).toMatch(/^[a-f0-9]{64}$/);

        const { createHash } = await import("node:crypto");
        const expectedHash = createHash("sha256").update(result.plain_secret).digest("hex");
        expect(stored!.client_secret).toBe(expectedHash);
    });

    it("appends a new secret when one already exists", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        vi.mocked(globalThis.requireUser).mockResolvedValue(user);

        const oauthDb = await import("~~/server/utils/database/oauth2_applications");
        const app = await oauthDb.createOAuth2Application(
            { context: { drizzle: ctx.drizzle } } as any,
            user.id,
            "My App",
            null,
            false,
            "third",
        );

        // Add a first secret via the handler
        mockParams.values = { id: app.client_id };
        const first = await handler(createEvent());

        // Add a second secret
        const second = await handler(createEvent());

        expect(first.plain_secret).not.toBe(second.plain_secret);

        const stored = ctx.drizzle
            .select()
            .from(oauth2Applications)
            .where(eq(oauth2Applications.client_id, app.client_id))
            .get();
        const parts = stored!.client_secret.split(" ");
        expect(parts).toHaveLength(2);
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

    it("allows admin to create a secret on any application", async () => {
        const owner = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const admin = seedUser(ctx, { email: "admin@basischina.com", role: "admin" });
        vi.mocked(globalThis.requireUser).mockResolvedValue(admin);

        const oauthDb = await import("~~/server/utils/database/oauth2_applications");
        const app = await oauthDb.createOAuth2Application(
            { context: { drizzle: ctx.drizzle } } as any,
            owner.id,
            "Admin Managed App",
            null,
            false,
            "third",
        );

        mockParams.values = { id: app.client_id };

        const result = await handler(createEvent());
        expect(result).toHaveProperty("plain_secret");
    });

    it("allows owner to create a secret on their own application", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        vi.mocked(globalThis.requireUser).mockResolvedValue(user);

        const oauthDb = await import("~~/server/utils/database/oauth2_applications");
        const app = await oauthDb.createOAuth2Application(
            { context: { drizzle: ctx.drizzle } } as any,
            user.id,
            "Owner App",
            null,
            false,
            "third",
        );

        mockParams.values = { id: app.client_id };

        const result = await handler(createEvent());
        expect(result).toHaveProperty("plain_secret");
    });

    it("returns 400 when the route param id is empty", async () => {
        const user = seedUser(ctx, { email: "user@basischina.com", role: "admin" });
        vi.mocked(globalThis.requireUser).mockResolvedValue(user);

        mockParams.values = { id: "" };

        await expect(handler(createEvent())).rejects.toThrow();
    });
});

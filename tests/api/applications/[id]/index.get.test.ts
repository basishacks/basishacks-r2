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

let ctx: TestContext;
let getHandler: any;

beforeAll(async () => {
    setupNitroGlobals();

    const oauthDb = await import("~~/server/utils/database/oauth2_applications");
    vi.stubGlobal("getOAuth2Application", oauthDb.getOAuth2Application);

    getHandler = (await import("~~/server/api/applications/[id]/index.get")).default;
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

describe("GET /api/applications/[id]", () => {
    it("returns 404 when the application does not exist", async () => {
        vi.mocked(globalThis.requireUser).mockResolvedValue({ id: 1, role: "participant" });
        mockParams.values = { id: "nonexistent-client-id" };

        await expect(getHandler(createEvent())).rejects.toMatchObject({ statusCode: 404 });
    });

    it("returns the application for the owner", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const oauthDb = await import("~~/server/utils/database/oauth2_applications");
        const app = await oauthDb.createOAuth2Application(
            { context: { drizzle: ctx.drizzle } } as any,
            user.id,
            "Owner App",
            null,
            false,
            "third",
        );

        vi.mocked(globalThis.requireUser).mockResolvedValue(user);
        mockParams.values = { id: app.client_id };

        const result = await getHandler(createEvent());
        expect(result.client_id).toBe(app.client_id);
        expect(result.name).toBe("Owner App");
        expect(result).not.toHaveProperty("client_secret");
    });

    it("returns the application for a user with portal.applications.view.all permission", async () => {
        const owner = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const viewer = seedUser(ctx, { email: "viewer@basischina.com", role: "participant" });
        const oauthDb = await import("~~/server/utils/database/oauth2_applications");
        const app = await oauthDb.createOAuth2Application(
            { context: { drizzle: ctx.drizzle } } as any,
            owner.id,
            "Viewable App",
            null,
            false,
            "third",
        );

        vi.mocked(globalThis.requireUser).mockResolvedValue({
            ...viewer,
            role: "portal.applications.view.all",
        });
        mockParams.values = { id: app.client_id };

        const result = await getHandler(createEvent());
        expect(result.client_id).toBe(app.client_id);
        expect(result).not.toHaveProperty("client_secret");
    });

    it("returns the application for an admin", async () => {
        const owner = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const admin = seedUser(ctx, { email: "admin@basischina.com", role: "admin" });
        const oauthDb = await import("~~/server/utils/database/oauth2_applications");
        const app = await oauthDb.createOAuth2Application(
            { context: { drizzle: ctx.drizzle } } as any,
            owner.id,
            "Admin Viewable App",
            null,
            false,
            "third",
        );

        vi.mocked(globalThis.requireUser).mockResolvedValue(admin);
        mockParams.values = { id: app.client_id };

        const result = await getHandler(createEvent());
        expect(result.client_id).toBe(app.client_id);
        expect(result).not.toHaveProperty("client_secret");
    });

    it("returns 403 when the caller is neither owner nor authorized", async () => {
        const owner = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const other = seedUser(ctx, { email: "other@basischina.com", role: "participant" });
        const oauthDb = await import("~~/server/utils/database/oauth2_applications");
        const app = await oauthDb.createOAuth2Application(
            { context: { drizzle: ctx.drizzle } } as any,
            owner.id,
            "Private App",
            null,
            false,
            "third",
        );

        vi.mocked(globalThis.requireUser).mockResolvedValue(other);
        mockParams.values = { id: app.client_id };

        await expect(getHandler(createEvent())).rejects.toMatchObject({ statusCode: 403 });
    });
});

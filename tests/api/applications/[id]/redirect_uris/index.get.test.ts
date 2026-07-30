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
    vi.stubGlobal("getOAuth2ApplicationRedirectUris", oauthDb.getOAuth2ApplicationRedirectUris);

    getHandler = (await import("~~/server/api/applications/[id]/redirect_uris/index.get")).default;
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

describe("GET /api/applications/:id/redirect_uris", () => {
    it("returns redirect URIs for the application owner", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com" });
        const oauthDb = await import("~~/server/utils/database/oauth2_applications");
        const app = await oauthDb.createOAuth2Application(
            { context: { drizzle: ctx.drizzle } } as any,
            user.id,
            "My App",
            null,
            false,
            "third",
        );

        await oauthDb.addOAuth2ApplicationRedirectUri(
            { context: { drizzle: ctx.drizzle } } as any,
            app.client_id,
            "https://example.com/callback",
        );
        await oauthDb.addOAuth2ApplicationRedirectUri(
            { context: { drizzle: ctx.drizzle } } as any,
            app.client_id,
            "https://example.com/signin",
        );

        vi.mocked(globalThis.requireUser).mockResolvedValue(user);
        mockParams.values = { id: app.client_id };

        const result = await getHandler(createEvent());

        expect(Array.isArray(result)).toBe(true);
        expect(result).toEqual([
            { uri: "https://example.com/callback" },
            { uri: "https://example.com/signin" },
        ]);
    });

    it("returns redirect URIs for an admin", async () => {
        const owner = seedUser(ctx, { email: "owner@basischina.com" });
        const admin = seedUser(ctx, { email: "admin@basischina.com", role: "admin" });
        const oauthDb = await import("~~/server/utils/database/oauth2_applications");
        const app = await oauthDb.createOAuth2Application(
            { context: { drizzle: ctx.drizzle } } as any,
            owner.id,
            "Admin App",
            null,
            false,
            "third",
        );

        await oauthDb.addOAuth2ApplicationRedirectUri(
            { context: { drizzle: ctx.drizzle } } as any,
            app.client_id,
            "https://admin.example.com/cb",
        );

        vi.mocked(globalThis.requireUser).mockResolvedValue(admin);
        mockParams.values = { id: app.client_id };

        const result = await getHandler(createEvent());
        expect(result).toEqual([{ uri: "https://admin.example.com/cb" }]);
    });

    it("returns redirect URIs for a user with portal.applications.view.all permission", async () => {
        const owner = seedUser(ctx, { email: "owner@basischina.com" });
        const viewer = seedUser(ctx, { email: "viewer@basischina.com" });
        const oauthDb = await import("~~/server/utils/database/oauth2_applications");
        const app = await oauthDb.createOAuth2Application(
            { context: { drizzle: ctx.drizzle } } as any,
            owner.id,
            "Viewable App",
            null,
            false,
            "third",
        );

        await oauthDb.addOAuth2ApplicationRedirectUri(
            { context: { drizzle: ctx.drizzle } } as any,
            app.client_id,
            "https://viewer.example.com/cb",
        );

        vi.mocked(globalThis.requireUser).mockResolvedValue({
            ...viewer,
            role: "portal.applications.view.all",
        });
        mockParams.values = { id: app.client_id };

        const result = await getHandler(createEvent());
        expect(result).toEqual([{ uri: "https://viewer.example.com/cb" }]);
    });

    it("returns empty array when the application has no redirect URIs", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com" });
        const oauthDb = await import("~~/server/utils/database/oauth2_applications");
        const app = await oauthDb.createOAuth2Application(
            { context: { drizzle: ctx.drizzle } } as any,
            user.id,
            "No URIs App",
            null,
            false,
            "third",
        );

        vi.mocked(globalThis.requireUser).mockResolvedValue(user);
        mockParams.values = { id: app.client_id };

        const result = await getHandler(createEvent());
        expect(result).toEqual([]);
    });

    it("returns 404 when the application does not exist", async () => {
        vi.mocked(globalThis.requireUser).mockResolvedValue({ id: 1, role: "participant" });
        mockParams.values = { id: "nonexistent-client-id" };

        await expect(getHandler(createEvent())).rejects.toMatchObject({ statusCode: 404 });
    });

    it("returns 403 when the caller is neither owner nor authorized", async () => {
        const owner = seedUser(ctx, { email: "owner@basischina.com" });
        const other = seedUser(ctx, { email: "other@basischina.com" });
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

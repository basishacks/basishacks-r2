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
import type { OAuth2Application } from "~~/shared/database";

vi.mock("~~/server/utils/rateLimit", () => ({
    applyRateLimit: (fn: any) => fn,
    DEFAULT_RATE_LIMIT_CONFIG: { maxRequests: 6000, windowMs: 60 * 1000 },
}));

let ctx: TestContext;
let getHandler: any;

async function createTestApp(
    drizzle: TestContext["drizzle"],
    ownerId: number,
    name = "Test App",
): Promise<OAuth2Application> {
    const mod = await import("~~/server/utils/database/oauth2_applications");
    return mod.createOAuth2Application(
        { context: { drizzle } } as any,
        ownerId,
        name,
        null,
        false,
        "third",
    );
}

async function addScopes(
    drizzle: TestContext["drizzle"],
    clientId: string,
    scopes: string[],
): Promise<void> {
    const mod = await import("~~/server/utils/database/oauth2_applications");
    await mod.addOAuth2ApplicationScopes({ context: { drizzle } } as any, clientId, scopes);
}

beforeAll(async () => {
    setupNitroGlobals();

    const oauthDb = await import("~~/server/utils/database/oauth2_applications");
    vi.stubGlobal("getOAuth2Application", oauthDb.getOAuth2Application);
    vi.stubGlobal("getOAuth2ApplicationScopes", oauthDb.getOAuth2ApplicationScopes);

    getHandler = (await import("~~/server/api/applications/[id]/scopes/index.get")).default;
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

describe("GET /api/applications/:id/scopes", () => {
    it("returns scopes for the app owner", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const app = await createTestApp(ctx.drizzle, user.id);
        await addScopes(ctx.drizzle, app.client_id, ["openid", "email"]);

        vi.mocked(globalThis.requireUser).mockResolvedValue(user);
        mockParams.values = { id: app.client_id };

        const result = await getHandler(createEvent());

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
            scope: "openid",
            description: "Access basic OpenID Connect identity information",
            adminOnly: false,
        });
        expect(result[1]).toEqual({
            scope: "email",
            description: "Access user's email address",
            adminOnly: false,
        });
    });

    it("returns scopes for an admin viewing another user's app", async () => {
        const owner = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const admin = seedUser(ctx, { email: "admin@basischina.com", role: "admin" });
        const app = await createTestApp(ctx.drizzle, owner.id);
        await addScopes(ctx.drizzle, app.client_id, ["profile"]);

        vi.mocked(globalThis.requireUser).mockResolvedValue(admin);
        mockParams.values = { id: app.client_id };

        const result = await getHandler(createEvent());
        expect(result).toHaveLength(1);
        expect(result[0].scope).toBe("profile");
    });

    it("returns scopes for a user with portal.applications.view.all permission", async () => {
        const owner = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const viewer = seedUser(ctx, { email: "viewer@basischina.com", role: "participant" });
        const app = await createTestApp(ctx.drizzle, owner.id);
        await addScopes(ctx.drizzle, app.client_id, ["openid"]);

        vi.mocked(globalThis.requireUser).mockResolvedValue({
            ...viewer,
            role: "portal.applications.view.all",
        });
        mockParams.values = { id: app.client_id };

        const result = await getHandler(createEvent());
        expect(result).toHaveLength(1);
        expect(result[0].scope).toBe("openid");
    });

    it("returns 404 when the application does not exist", async () => {
        vi.mocked(globalThis.requireUser).mockResolvedValue({ id: 1, role: "admin" });
        mockParams.values = { id: "nonexistent-client-id" };

        await expect(getHandler(createEvent())).rejects.toMatchObject({ statusCode: 404 });
    });

    it("returns 403 when the caller is neither owner nor authorized", async () => {
        const owner = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const other = seedUser(ctx, { email: "other@basischina.com", role: "participant" });
        const app = await createTestApp(ctx.drizzle, owner.id);

        vi.mocked(globalThis.requireUser).mockResolvedValue(other);
        mockParams.values = { id: app.client_id };

        await expect(getHandler(createEvent())).rejects.toMatchObject({ statusCode: 403 });
    });

    it("returns an empty array when the app has no scopes", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const app = await createTestApp(ctx.drizzle, user.id);

        vi.mocked(globalThis.requireUser).mockResolvedValue(user);
        mockParams.values = { id: app.client_id };

        const result = await getHandler(createEvent());
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(0);
    });

    it("enriches each scope with description from OAuth2Scopes", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const app = await createTestApp(ctx.drizzle, user.id);
        await addScopes(ctx.drizzle, app.client_id, [
            "openid",
            "meetings.read.application",
            "chat.read",
        ]);

        vi.mocked(globalThis.requireUser).mockResolvedValue(user);
        mockParams.values = { id: app.client_id };

        const result = await getHandler(createEvent());
        expect(result).toHaveLength(3);

        const openid = result.find((s: any) => s.scope === "openid");
        expect(openid.description).toBe("Access basic OpenID Connect identity information");
        expect(openid.adminOnly).toBe(false);

        const meeting = result.find((s: any) => s.scope === "meetings.read.application");
        expect(meeting.description).toBe("Reads meetings that are bound to this application.");
        expect(meeting.adminOnly).toBe(false);

        const chat = result.find((s: any) => s.scope === "chat.read");
        expect(chat.description).toBe("Read Microsoft Teams chat");
        expect(chat.adminOnly).toBe(false);
    });

    it("enriches admin-only scopes with adminOnly: true", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const app = await createTestApp(ctx.drizzle, user.id);
        // Use the DB directly since the API enforces admin-only at POST time
        const mod = await import("~~/server/utils/database/oauth2_applications");
        await mod.addOAuth2ApplicationScopes(
            { context: { drizzle: ctx.drizzle } } as any,
            app.client_id,
            ["meetings.read.all"],
        );

        vi.mocked(globalThis.requireUser).mockResolvedValue(user);
        mockParams.values = { id: app.client_id };

        const result = await getHandler(createEvent());
        expect(result).toHaveLength(1);
        expect(result[0].scope).toBe("meetings.read.all");
        expect(result[0].adminOnly).toBe(true);
        expect(result[0].description).toBe("Reads all meetings of the user");
    });

    it("uses 'Unknown scope' for scopes not in OAuth2Scopes", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const app = await createTestApp(ctx.drizzle, user.id);

        // Write a non-registered scope directly to the permissions column
        const { oauth2Applications } = await import("~~/server/database/schema");
        const { eq } = await import("drizzle-orm");
        ctx.drizzle
            .update(oauth2Applications)
            .set({ permissions: "openid unknown_custom_scope" })
            .where(eq(oauth2Applications.client_id, app.client_id))
            .run();

        vi.mocked(globalThis.requireUser).mockResolvedValue(user);
        mockParams.values = { id: app.client_id };

        const result = await getHandler(createEvent());
        expect(result).toHaveLength(2);
        const unknown = result.find((s: any) => s.scope === "unknown_custom_scope");
        expect(unknown).toBeDefined();
        expect(unknown.description).toBe("Unknown scope");
        expect(unknown.adminOnly).toBe(false);
    });

    it("rejects empty route parameter", async () => {
        vi.mocked(globalThis.requireUser).mockResolvedValue({ id: 1, role: "admin" });
        mockParams.values = { id: "" };

        await expect(getHandler(createEvent())).rejects.toThrow();
    });
});

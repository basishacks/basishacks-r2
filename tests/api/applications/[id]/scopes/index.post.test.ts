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
import type { OAuth2Application } from "~~/shared/database";

vi.mock("~~/server/utils/rateLimit", () => ({
    applyRateLimit: (fn: any) => fn,
    DEFAULT_RATE_LIMIT_CONFIG: { maxRequests: 6000, windowMs: 60 * 1000 },
}));

let ctx: TestContext;
let postHandler: any;

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

beforeAll(async () => {
    setupNitroGlobals();

    const oauthDb = await import("~~/server/utils/database/oauth2_applications");
    vi.stubGlobal("getOAuth2Application", oauthDb.getOAuth2Application);
    vi.stubGlobal("addOAuth2ApplicationScopes", oauthDb.addOAuth2ApplicationScopes);

    postHandler = (await import("~~/server/api/applications/[id]/scopes/index.post")).default;
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

describe("POST /api/applications/:id/scopes", () => {
    it("adds scopes as the app owner", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const app = await createTestApp(ctx.drizzle, user.id);

        vi.mocked(globalThis.requireUser).mockResolvedValue(user);
        mockParams.values = { id: app.client_id };
        mockBody.value = { scopes: ["openid", "email"] };

        const result = await postHandler(createEvent());

        expect(result).toEqual({ message: "Scopes added" });

        const mod = await import("~~/server/utils/database/oauth2_applications");
        const scopes = await mod.getOAuth2ApplicationScopes(
            { context: { drizzle: ctx.drizzle } } as any,
            app.client_id,
        );
        expect(scopes).toContain("openid");
        expect(scopes).toContain("email");
    });

    it("adds scopes as an admin for another user's app", async () => {
        const owner = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const admin = seedUser(ctx, { email: "admin@basischina.com", role: "admin" });
        const app = await createTestApp(ctx.drizzle, owner.id);

        vi.mocked(globalThis.requireUser).mockResolvedValue(admin);
        mockParams.values = { id: app.client_id };
        mockBody.value = { scopes: ["profile"] };

        const result = await postHandler(createEvent());
        expect(result).toEqual({ message: "Scopes added" });
    });

    it("adds scopes as a user with portal.applications.view.all permission", async () => {
        const owner = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const viewer = seedUser(ctx, { email: "viewer@basischina.com", role: "participant" });
        const app = await createTestApp(ctx.drizzle, owner.id);

        vi.mocked(globalThis.requireUser).mockResolvedValue({
            ...viewer,
            role: "portal.applications.view.all",
        });
        mockParams.values = { id: app.client_id };
        mockBody.value = { scopes: ["email"] };

        const result = await postHandler(createEvent());
        expect(result).toEqual({ message: "Scopes added" });
    });

    it("returns 404 when the application does not exist", async () => {
        vi.mocked(globalThis.requireUser).mockResolvedValue({ id: 1, role: "admin" });
        mockParams.values = { id: "nonexistent-client-id" };
        mockBody.value = { scopes: ["openid"] };

        await expect(postHandler(createEvent())).rejects.toMatchObject({ statusCode: 404 });
    });

    it("returns 403 when the caller is neither owner nor authorized", async () => {
        const owner = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const other = seedUser(ctx, { email: "other@basischina.com", role: "participant" });
        const app = await createTestApp(ctx.drizzle, owner.id);

        vi.mocked(globalThis.requireUser).mockResolvedValue(other);
        mockParams.values = { id: app.client_id };
        mockBody.value = { scopes: ["openid"] };

        await expect(postHandler(createEvent())).rejects.toMatchObject({ statusCode: 403 });
    });

    it("returns 400 for invalid scopes not in OAuth2ScopesList", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const app = await createTestApp(ctx.drizzle, user.id);

        vi.mocked(globalThis.requireUser).mockResolvedValue(user);
        mockParams.values = { id: app.client_id };
        mockBody.value = { scopes: ["invalid_scope_xyz"] };

        await expect(postHandler(createEvent())).rejects.toMatchObject({ statusCode: 400 });
    });

    it("returns 403 when a non-admin user tries to add admin-only scopes", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const app = await createTestApp(ctx.drizzle, user.id);

        vi.mocked(globalThis.requireUser).mockResolvedValue(user);
        mockParams.values = { id: app.client_id };
        mockBody.value = { scopes: ["meetings.read.all"] };

        await expect(postHandler(createEvent())).rejects.toMatchObject({ statusCode: 403 });
    });

    it("allows an admin user to add admin-only scopes", async () => {
        const owner = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const admin = seedUser(ctx, { email: "admin@basischina.com", role: "admin" });
        const app = await createTestApp(ctx.drizzle, owner.id);

        vi.mocked(globalThis.requireUser).mockResolvedValue(admin);
        mockParams.values = { id: app.client_id };
        mockBody.value = { scopes: ["meetings.read.all"] };

        const result = await postHandler(createEvent());
        expect(result).toEqual({ message: "Scopes added" });
    });

    it("accepts empty scopes array (no scopes to add)", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const app = await createTestApp(ctx.drizzle, user.id);

        vi.mocked(globalThis.requireUser).mockResolvedValue(user);
        mockParams.values = { id: app.client_id };
        mockBody.value = { scopes: [] };

        const result = await postHandler(createEvent());
        expect(result).toEqual({ message: "Scopes added" });
    });

    it("returns 400 for a scope string exceeding 128 characters", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const app = await createTestApp(ctx.drizzle, user.id);

        vi.mocked(globalThis.requireUser).mockResolvedValue(user);
        mockParams.values = { id: app.client_id };
        mockBody.value = { scopes: ["a".repeat(129)] };

        await expect(postHandler(createEvent())).rejects.toMatchObject({ statusCode: 400 });
    });

    it("returns 400 for more than 50 scopes", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const app = await createTestApp(ctx.drizzle, user.id);

        vi.mocked(globalThis.requireUser).mockResolvedValue(user);
        mockParams.values = { id: app.client_id };
        mockBody.value = { scopes: Array.from({ length: 51 }, (_, i) => `scope${i}`) };

        await expect(postHandler(createEvent())).rejects.toMatchObject({ statusCode: 400 });
    });

    it("returns 400 for an empty string in scopes array", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const app = await createTestApp(ctx.drizzle, user.id);

        vi.mocked(globalThis.requireUser).mockResolvedValue(user);
        mockParams.values = { id: app.client_id };
        mockBody.value = { scopes: [""] };

        await expect(postHandler(createEvent())).rejects.toMatchObject({ statusCode: 400 });
    });

    it("does not duplicate scopes that already exist", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const app = await createTestApp(ctx.drizzle, user.id);

        // Pre-add a scope
        const mod = await import("~~/server/utils/database/oauth2_applications");
        await mod.addOAuth2ApplicationScopes(
            { context: { drizzle: ctx.drizzle } } as any,
            app.client_id,
            ["openid"],
        );

        vi.mocked(globalThis.requireUser).mockResolvedValue(user);
        mockParams.values = { id: app.client_id };
        mockBody.value = { scopes: ["openid", "email"] };

        await postHandler(createEvent());

        const scopes = await mod.getOAuth2ApplicationScopes(
            { context: { drizzle: ctx.drizzle } } as any,
            app.client_id,
        );
        // openid should appear only once
        expect(scopes.filter((s: string) => s === "openid")).toHaveLength(1);
        expect(scopes).toContain("email");
    });

    it("rejects empty route parameter", async () => {
        vi.mocked(globalThis.requireUser).mockResolvedValue({ id: 1, role: "admin" });
        mockParams.values = { id: "" };
        mockBody.value = { scopes: ["openid"] };

        await expect(postHandler(createEvent())).rejects.toThrow();
    });
});

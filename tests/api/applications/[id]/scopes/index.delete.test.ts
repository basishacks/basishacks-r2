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
let deleteHandler: any;

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
    vi.stubGlobal("removeOAuth2ApplicationScope", oauthDb.removeOAuth2ApplicationScope);

    deleteHandler = (await import("~~/server/api/applications/[id]/scopes/index.delete")).default;
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

describe("DELETE /api/applications/:id/scopes", () => {
    it("removes a scope as the app owner", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const app = await createTestApp(ctx.drizzle, user.id);
        await addScopes(ctx.drizzle, app.client_id, ["openid", "email", "profile"]);

        vi.mocked(globalThis.requireUser).mockResolvedValue(user);
        mockParams.values = { id: app.client_id };
        mockBody.value = { scope: "email" };

        const result = await deleteHandler(createEvent());

        expect(result).toEqual({ message: "Scope removed" });

        const mod = await import("~~/server/utils/database/oauth2_applications");
        const scopes = await mod.getOAuth2ApplicationScopes(
            { context: { drizzle: ctx.drizzle } } as any,
            app.client_id,
        );
        expect(scopes).not.toContain("email");
        expect(scopes).toContain("openid");
        expect(scopes).toContain("profile");
    });

    it("removes a scope as an admin for another user's app", async () => {
        const owner = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const admin = seedUser(ctx, { email: "admin@basischina.com", role: "admin" });
        const app = await createTestApp(ctx.drizzle, owner.id);
        await addScopes(ctx.drizzle, app.client_id, ["openid"]);

        vi.mocked(globalThis.requireUser).mockResolvedValue(admin);
        mockParams.values = { id: app.client_id };
        mockBody.value = { scope: "openid" };

        const result = await deleteHandler(createEvent());
        expect(result).toEqual({ message: "Scope removed" });
    });

    it("removes a scope as a user with portal.applications.view.all permission", async () => {
        const owner = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const viewer = seedUser(ctx, { email: "viewer@basischina.com", role: "participant" });
        const app = await createTestApp(ctx.drizzle, owner.id);
        await addScopes(ctx.drizzle, app.client_id, ["openid"]);

        vi.mocked(globalThis.requireUser).mockResolvedValue({
            ...viewer,
            role: "portal.applications.view.all",
        });
        mockParams.values = { id: app.client_id };
        mockBody.value = { scope: "openid" };

        const result = await deleteHandler(createEvent());
        expect(result).toEqual({ message: "Scope removed" });
    });

    it("returns 404 when the application does not exist", async () => {
        vi.mocked(globalThis.requireUser).mockResolvedValue({ id: 1, role: "admin" });
        mockParams.values = { id: "nonexistent-client-id" };
        mockBody.value = { scope: "openid" };

        await expect(deleteHandler(createEvent())).rejects.toMatchObject({ statusCode: 404 });
    });

    it("returns 403 when the caller is neither owner nor authorized", async () => {
        const owner = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const other = seedUser(ctx, { email: "other@basischina.com", role: "participant" });
        const app = await createTestApp(ctx.drizzle, owner.id);

        vi.mocked(globalThis.requireUser).mockResolvedValue(other);
        mockParams.values = { id: app.client_id };
        mockBody.value = { scope: "openid" };

        await expect(deleteHandler(createEvent())).rejects.toMatchObject({ statusCode: 403 });
    });

    it("returns 404 when the scope is not on the application", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const app = await createTestApp(ctx.drizzle, user.id);
        await addScopes(ctx.drizzle, app.client_id, ["openid"]);

        vi.mocked(globalThis.requireUser).mockResolvedValue(user);
        mockParams.values = { id: app.client_id };
        mockBody.value = { scope: "nonexistent-scope" };

        await expect(deleteHandler(createEvent())).rejects.toMatchObject({ statusCode: 404 });
    });

    it("returns 404 when the application has no scopes at all", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const app = await createTestApp(ctx.drizzle, user.id);

        vi.mocked(globalThis.requireUser).mockResolvedValue(user);
        mockParams.values = { id: app.client_id };
        mockBody.value = { scope: "openid" };

        await expect(deleteHandler(createEvent())).rejects.toMatchObject({ statusCode: 404 });
    });

    it("rejects empty scope string via validation", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const app = await createTestApp(ctx.drizzle, user.id);

        vi.mocked(globalThis.requireUser).mockResolvedValue(user);
        mockParams.values = { id: app.client_id };
        mockBody.value = { scope: "" };

        await expect(deleteHandler(createEvent())).rejects.toThrow();
    });

    it("rejects an excessively long scope string", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com", role: "participant" });
        const app = await createTestApp(ctx.drizzle, user.id);

        vi.mocked(globalThis.requireUser).mockResolvedValue(user);
        mockParams.values = { id: app.client_id };
        mockBody.value = { scope: "a".repeat(129) };

        await expect(deleteHandler(createEvent())).rejects.toThrow();
    });

    it("rejects empty route parameter", async () => {
        vi.mocked(globalThis.requireUser).mockResolvedValue({ id: 1, role: "admin" });
        mockParams.values = { id: "" };
        mockBody.value = { scope: "openid" };

        await expect(deleteHandler(createEvent())).rejects.toThrow();
    });
});

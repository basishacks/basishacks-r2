import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import {
    createTestContext,
    resetTestContext,
    resetMockState,
    setupNitroGlobals,
    mockBody,
    seedHackathon,
    seedSeason,
    seedUser,
    type TestContext,
} from "../helpers";
import { DevPermissions } from "~~/shared/permissions";
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
    vi.stubGlobal("createOAuth2Application", oauthDb.createOAuth2Application);
    vi.stubGlobal("getOAuth2ApplicationCountByOwner", oauthDb.getOAuth2ApplicationCountByOwner);

    handler = (await import("~~/server/api/applications/index.post")).default;
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

describe("POST /api/applications", () => {
    it("creates a first-party application when permitted", async () => {
        (globalThis as any).requirePermission.mockResolvedValue({
            id: 1,
            role: `${DevPermissions.PORTAL_APPLICATIONS_CREATE} ${DevPermissions.PORTAL_APPLICATIONS_CREATE_FIRST_PARTY}`,
        });

        seedUser(ctx, { email: "dev@basischina.com", name: "Developer" });

        mockBody.value = {
            name: "First Party App",
            proxy_microsoft: false,
            type: "first",
        };

        const result = await handler(createEvent());

        expect(result).toHaveProperty("type", "first");

        const stored = ctx.drizzle
            .select()
            .from(oauth2Applications)
            .where(eq(oauth2Applications.client_id, result.client_id))
            .get();
        expect(stored!.type).toBe("first");
    });

    it("downgrades to third-party when user lacks first-party permission", async () => {
        (globalThis as any).requirePermission.mockResolvedValue({
            id: 1,
            role: DevPermissions.PORTAL_APPLICATIONS_CREATE,
        });

        seedUser(ctx, { email: "dev@basischina.com", name: "Developer" });

        mockBody.value = {
            name: "Impersonating First Party App",
            proxy_microsoft: false,
            type: "first",
        };

        const result = await handler(createEvent());

        expect(result).toHaveProperty("type", "third");

        const stored = ctx.drizzle
            .select()
            .from(oauth2Applications)
            .where(eq(oauth2Applications.client_id, result.client_id))
            .get();
        expect(stored!.type).toBe("third");
    });
});

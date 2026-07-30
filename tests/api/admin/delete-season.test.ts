import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import {
    createTestContext,
    resetTestContext,
    resetMockState,
    setupNitroGlobals,
    mockParams,
    seedHackathon,
    seedSeason,
    type TestContext,
} from "../helpers";
import { seasons } from "~~/server/database/schema";
import { eq } from "drizzle-orm";

vi.mock("~~/server/utils/rateLimit", () => ({
    applyRateLimit: (fn: any) => fn,
    DEFAULT_RATE_LIMIT_CONFIG: { maxRequests: 6000, windowMs: 60 * 1000 },
}));

let ctx: TestContext;
let deleteHandler: any;

beforeAll(async () => {
    setupNitroGlobals();

    const seasonsDb = await import("~~/server/utils/database/seasons");
    vi.stubGlobal("getSeasons", seasonsDb.getSeasons);

    deleteHandler = (await import("~~/server/api/admin/seasons/[id]/index.delete")).default;
});

beforeEach(async () => {
    resetMockState();
    ctx = await createTestContext();
    seedHackathon(ctx);
});

afterEach(() => {
    resetTestContext(ctx);
});

function createEvent(overrides: Record<string, unknown> = {}) {
    return { context: { drizzle: ctx.drizzle }, ...overrides };
}

function gRequireAdmin() {
    return vi.mocked(globalThis.requireAdmin);
}

describe("DELETE /api/admin/seasons/[id]", () => {
    it("requires admin role", async () => {
        gRequireAdmin().mockRejectedValue(
            Object.assign(new Error("Insufficient permissions"), { statusCode: 403 }),
        );

        await expect(deleteHandler(createEvent())).rejects.toMatchObject({ statusCode: 403 });
    });

    it("deletes a season", async () => {
        gRequireAdmin().mockResolvedValue({ id: 1, role: "admin" });
        seedSeason(ctx, { name: "Delete Me" });

        const existing = ctx.drizzle.select().from(seasons).where(eq(seasons.id, 1)).get();
        expect(existing).not.toBeNull();

        mockParams.values["id"] = "1";
        const result = await deleteHandler(createEvent());

        expect(result.seasons.find((s: any) => s.id === 1)).toBeUndefined();

        const deleted = ctx.drizzle.select().from(seasons).where(eq(seasons.id, 1)).get();
        expect(deleted).toBeUndefined();
    });

    it("returns 404 for non-existent season", async () => {
        gRequireAdmin().mockResolvedValue({ id: 1, role: "admin" });

        mockParams.values["id"] = "999";
        await expect(deleteHandler(createEvent())).rejects.toMatchObject({ statusCode: 404 });
    });
});

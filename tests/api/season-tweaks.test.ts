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
    type TestContext,
} from "./helpers";
import { eq } from "drizzle-orm";
import { hackathon, seasons } from "~~/server/database/schema";

let ctx: TestContext;
let getTweaksHandler: any;
let patchTweaksHandler: any;

beforeAll(async () => {
    setupNitroGlobals();

    const hackathonDb = await import("~~/server/utils/database/hackathon");
    vi.stubGlobal("getHackathon", hackathonDb.getHackathon);
    vi.stubGlobal("updateHackathon", hackathonDb.updateHackathon);

    const seasonsDb = await import("~~/server/utils/database/seasons");
    vi.stubGlobal("getSeasonById", seasonsDb.getSeasonById);
    vi.stubGlobal("getActiveSeason", seasonsDb.getActiveSeason);
    vi.stubGlobal("updateSeasonTweaks", seasonsDb.updateSeasonTweaks);

    getTweaksHandler = (await import("~~/server/api/seasons/[id]/tweaks.get")).default;
    patchTweaksHandler = (await import("~~/server/api/seasons/[id]/tweaks.patch")).default;
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
    return {
        context: { drizzle: ctx.drizzle },
        ...overrides,
    };
}

describe("GET /api/seasons/:id/tweaks", () => {
    it("requires PORTAL_SEASONS_VIEW permission", async () => {
        vi.mocked(globalThis.requirePermission).mockRejectedValue(
            Object.assign(new Error("Insufficient permissions"), { statusCode: 403 }),
        );

        const season = seedSeason(ctx);
        mockParams.values["id"] = String(season.id);

        await expect(getTweaksHandler(createEvent())).rejects.toMatchObject({
            statusCode: 403,
        });
    });

    it("returns the season tweak row", async () => {
        vi.mocked(globalThis.requirePermission).mockResolvedValue({ id: 1, role: "admin" });

        const season = seedSeason(ctx);
        mockParams.values["id"] = String(season.id);

        const result = await getTweaksHandler(createEvent());

        expect(result).toHaveProperty("id", season.id);
        expect(result).toHaveProperty("name", "Season 1");
        expect(result).toHaveProperty("status", "not_started");
        expect(result).toHaveProperty("show_scores", 0);
        expect(result).toHaveProperty("show_ranking", 0);
        expect(result).toHaveProperty("voting_enabled", 0);
    });

    it("returns 404 when the season does not exist", async () => {
        vi.mocked(globalThis.requirePermission).mockResolvedValue({ id: 1, role: "admin" });

        mockParams.values["id"] = "9999";

        await expect(getTweaksHandler(createEvent())).rejects.toMatchObject({
            statusCode: 404,
        });
    });
});

describe("PATCH /api/seasons/:id/tweaks", () => {
    it("requires PORTAL_SEASONS_EDIT permission", async () => {
        vi.mocked(globalThis.requirePermission).mockRejectedValue(
            Object.assign(new Error("Insufficient permissions"), { statusCode: 403 }),
        );

        const season = seedSeason(ctx);
        mockParams.values["id"] = String(season.id);
        mockBody.value = { show_scores: true };

        await expect(patchTweaksHandler(createEvent())).rejects.toMatchObject({
            statusCode: 403,
        });
    });

    it("returns 404 when the season does not exist", async () => {
        vi.mocked(globalThis.requirePermission).mockResolvedValue({ id: 1, role: "admin" });

        mockParams.values["id"] = "9999";
        mockBody.value = { show_scores: true };

        await expect(patchTweaksHandler(createEvent())).rejects.toMatchObject({
            statusCode: 404,
        });
    });

    it("updates a single toggle and leaves other fields untouched", async () => {
        vi.mocked(globalThis.requirePermission).mockResolvedValue({ id: 1, role: "admin" });

        const season = seedSeason(ctx, { is_active: 0 });
        ctx.drizzle
            .update(seasons)
            .set({ theme_name: "Season Theme", status: "in_progress" })
            .where(eq(seasons.id, season.id))
            .run();

        mockParams.values["id"] = String(season.id);
        mockBody.value = { show_scores: true };

        const result = await patchTweaksHandler(createEvent());

        expect(result).toEqual({ message: "Season tweaks updated" });

        const row = ctx.drizzle.select().from(seasons).where(eq(seasons.id, season.id)).get();
        expect(row!.show_scores).toBe(1);
        expect(row!.show_ranking).toBe(0);
        expect(row!.status).toBe("in_progress");
        expect(row!.theme_name).toBe("Season Theme");
    });

    it("converts boolean toggles to 0/1 integers", async () => {
        vi.mocked(globalThis.requirePermission).mockResolvedValue({ id: 1, role: "admin" });

        const season = seedSeason(ctx, { is_active: 0 });

        mockParams.values["id"] = String(season.id);
        mockBody.value = {
            show_scores: true,
            show_ranking: false,
        };

        await patchTweaksHandler(createEvent());

        const row = ctx.drizzle.select().from(seasons).where(eq(seasons.id, season.id)).get();
        expect(row!.show_scores).toBe(1);
        expect(row!.show_ranking).toBe(0);
    });

    it("updates the season status", async () => {
        vi.mocked(globalThis.requirePermission).mockResolvedValue({ id: 1, role: "admin" });

        const season = seedSeason(ctx, { is_active: 0 });

        mockParams.values["id"] = String(season.id);
        mockBody.value = { status: "voting" };

        await patchTweaksHandler(createEvent());

        const row = ctx.drizzle.select().from(seasons).where(eq(seasons.id, season.id)).get();
        expect(row!.status).toBe("voting");
    });

    it("ignores non-tweakable fields", async () => {
        vi.mocked(globalThis.requirePermission).mockResolvedValue({ id: 1, role: "admin" });

        const season = seedSeason(ctx, { is_active: 0 });
        ctx.drizzle
            .update(seasons)
            .set({ theme_name: "Theme", voting_enabled: 0 })
            .where(eq(seasons.id, season.id))
            .run();

        mockParams.values["id"] = String(season.id);
        mockBody.value = { show_scores: true, theme_name: "Hacked", voting_enabled: true };

        await patchTweaksHandler(createEvent());

        const row = ctx.drizzle.select().from(seasons).where(eq(seasons.id, season.id)).get();
        expect(row!.show_scores).toBe(1);
        expect(row!.theme_name).toBe("Theme");
        expect(row!.voting_enabled).toBe(0);
    });

    it("also updates the hackathon row when editing the live season", async () => {
        vi.mocked(globalThis.requirePermission).mockResolvedValue({ id: 1, role: "admin" });

        const season = seedSeason(ctx, { is_active: 1 });

        mockParams.values["id"] = String(season.id);
        mockBody.value = { show_scores: true, show_ranking: true };

        await patchTweaksHandler(createEvent());

        const row = ctx.drizzle.select().from(seasons).where(eq(seasons.id, season.id)).get();
        expect(row!.show_scores).toBe(1);

        const live = ctx.drizzle.select().from(hackathon).get();
        expect(live!.show_scores).toBe(1);
        expect(live!.show_ranking).toBe(1);
    });

    it("does not touch the hackathon row when editing a non-live season", async () => {
        vi.mocked(globalThis.requirePermission).mockResolvedValue({ id: 1, role: "admin" });

        const season = seedSeason(ctx, { is_active: 0 });

        mockParams.values["id"] = String(season.id);
        mockBody.value = { show_scores: true };

        await patchTweaksHandler(createEvent());

        const live = ctx.drizzle.select().from(hackathon).get();
        expect(live!.show_scores).toBe(0);
        expect(live!.theme_name).toBe("Test Theme");
    });
});

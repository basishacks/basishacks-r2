import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import {
    createTestContext,
    resetTestContext,
    resetMockState,
    setupNitroGlobals,
    mockQueryState,
    seedHackathon,
    seedSeason,
    seedUser,
    seedTeam,
    type TestContext,
} from "./helpers";

let ctx: TestContext;
let scoresHandler: any;
let teamsHandler: any;

beforeAll(async () => {
    setupNitroGlobals();

    const seasonsDb = await import("~~/server/utils/database/seasons");
    vi.stubGlobal("getActiveSeason", seasonsDb.getActiveSeason);

    const teamsDb = await import("~~/server/utils/database/teams");
    vi.stubGlobal("getAllTeams", teamsDb.getAllTeams);
    vi.stubGlobal("getTeam", teamsDb.getTeam);
    vi.stubGlobal("updateTeam", teamsDb.updateTeam);

    const scoresDb = await import("~~/server/utils/database/scores");
    vi.stubGlobal("getTeamScoresByTeamID", scoresDb.getTeamScoresByTeamID);

    const awardsDb = await import("~~/server/utils/database/awards");
    vi.stubGlobal("getAwardsForTeams", awardsDb.getAwardsForTeams);

    const { convertTeamToPublic } = await import("~~/server/utils/convert");
    vi.stubGlobal("convertTeamToPublic", convertTeamToPublic);

    scoresHandler = (await import("~~/server/api/admin/scores.get")).default;
    teamsHandler = (await import("~~/server/api/admin/teams.get")).default;
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

function gRequireAdmin() {
    return vi.mocked(globalThis.requireAdmin);
}

function gRequirePermission() {
    return vi.mocked(globalThis.requirePermission);
}

describe("GET /api/admin/scores", () => {
    it("requires admin role", async () => {
        gRequireAdmin().mockRejectedValue(
            Object.assign(new Error("Insufficient permissions"), { statusCode: 403 }),
        );

        await expect(scoresHandler(createEvent())).rejects.toMatchObject({ statusCode: 403 });
    });

    it("returns teams with computed scores and rankings", async () => {
        gRequireAdmin().mockResolvedValue({ id: 1, role: "admin" });

        seedTeam(ctx, {
            name: "Alpha Team",
            pathway: "junior",
            project_submitted: 1,
        });
        seedTeam(ctx, {
            name: "Beta Team",
            pathway: "senior",
            project_submitted: 1,
        });

        const result = await scoresHandler(createEvent());

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it("updates scores when update query is set", async () => {
        gRequireAdmin().mockResolvedValue({ id: 1, role: "admin" });

        seedTeam(ctx, {
            name: "Team",
            pathway: "junior",
            project_submitted: 1,
        });

        mockQueryState.value = { update: "true" };

        const result = await scoresHandler(createEvent());

        expect(Array.isArray(result)).toBe(true);
    });
});

describe("GET /api/admin/teams", () => {
    it("requires TEAMS permission", async () => {
        gRequirePermission().mockRejectedValue(
            Object.assign(new Error("Insufficient permissions"), { statusCode: 403 }),
        );

        await expect(teamsHandler(createEvent())).rejects.toMatchObject({ statusCode: 403 });
    });

    it("returns all teams with season names", async () => {
        gRequirePermission().mockResolvedValue({ id: 1, role: "admin" });

        seedTeam(ctx, { name: "Team A" });
        seedTeam(ctx, { name: "Team B" });

        const result = await teamsHandler(createEvent());

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(2);
        expect(result[0]).toHaveProperty("name", "Team A");
        expect(result[0]).toHaveProperty("season_name", "Season 1");
        expect(result[0]).toHaveProperty("members", []);
        expect(result[1]).toHaveProperty("name", "Team B");
        expect(result[1]).toHaveProperty("members", []);
    });

    it("returns members grouped by team", async () => {
        gRequirePermission().mockResolvedValue({ id: 1, role: "admin" });

        const teamA = seedTeam(ctx, { name: "Team A" });
        const teamB = seedTeam(ctx, { name: "Team B" });

        const alice = seedUser(ctx, {
            email: "alice@basischina.com",
            name: "Alice",
            team_id: teamA.id,
        });
        const bob = seedUser(ctx, {
            email: "bob@basischina.com",
            name: "Bob",
            team_id: teamA.id,
        });
        const carol = seedUser(ctx, {
            email: "carol@basischina.com",
            name: "Carol",
            team_id: teamB.id,
        });
        seedUser(ctx, { email: "teamless@basischina.com", name: "Teamless" });

        const result = await teamsHandler(createEvent());

        expect(result[0].members).toHaveLength(2);
        expect(result[0].members[0]).toMatchObject({
            id: alice.id,
            name: "Alice",
            email: "alice@basischina.com",
        });
        expect(result[0].members[1]).toMatchObject({
            id: bob.id,
            name: "Bob",
            email: "bob@basischina.com",
        });

        expect(result[1].members).toHaveLength(1);
        expect(result[1].members[0]).toMatchObject({
            id: carol.id,
            name: "Carol",
            email: "carol@basischina.com",
        });
    });
});

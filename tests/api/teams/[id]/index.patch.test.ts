import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import {
    createTestContext,
    resetTestContext,
    resetMockState,
    setupNitroGlobals,
    mockBody,
    mockParams,
    mockSession,
    seedHackathon,
    seedSeason,
    seedUser,
    seedTeam,
    type TestContext,
} from "../../helpers";
import { teams } from "~~/server/database/schema";
import { eq } from "drizzle-orm";

vi.mock("~~/server/utils/auth", () => ({
    requireUser: vi.fn(),
    requireJudge: vi.fn(),
    requireAdmin: vi.fn(),
    requirePermission: vi.fn(),
}));

vi.mock("~~/server/utils/rateLimit", () => ({
    applyRateLimit: (fn: any) => fn,
    DEFAULT_RATE_LIMIT_CONFIG: { maxRequests: 6000, windowMs: 60 * 1000 },
}));

let ctx: TestContext;
let handler: any;

beforeAll(async () => {
    setupNitroGlobals();

    const usersDb = await import("~~/server/utils/database/users");
    vi.stubGlobal("getUser", usersDb.getUser);

    const teamsDb = await import("~~/server/utils/database/teams");
    vi.stubGlobal("getTeam", teamsDb.getTeam);
    vi.stubGlobal("updateTeam", teamsDb.updateTeam);

    const hackathonDb = await import("~~/server/utils/database/hackathon");
    vi.stubGlobal("getHackathon", hackathonDb.getHackathon);

    handler = (await import("~~/server/api/teams/[id]/index.patch")).default;
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

describe("PATCH /api/teams/:id", () => {
    it("returns 403 when the hackathon has finished", async () => {
        resetTestContext(ctx);
        seedHackathon(ctx, { status: "finished" });
        seedSeason(ctx);

        const team = seedTeam(ctx, { name: "Locked Team" });
        seedUser(ctx, { email: "user@basischina.com", team_id: team.id });

        mockSession.value = { user: { id: 1 } };
        mockParams.values["id"] = String(team.id);
        mockBody.value = { name: "New Name" };

        await expect(handler(createEvent())).rejects.toMatchObject({
            statusCode: 403,
            message: "Cannot edit team and project after hackathon has finished",
        });
    });

    it("updates the team pathway", async () => {
        const team = seedTeam(ctx, { name: "Pathway Team", pathway: null });
        seedUser(ctx, { email: "user@basischina.com", team_id: team.id });

        mockSession.value = { user: { id: 1 } };
        mockParams.values["id"] = String(team.id);
        mockBody.value = { pathway: "senior" };

        const result = await handler(createEvent());

        expect(result).toEqual({ message: "Updated your team & project" });

        const updated = ctx.drizzle.select().from(teams).where(eq(teams.id, team.id)).get();
        expect(updated!.pathway).toBe("senior");
    });

    it("updates project sourcing notes", async () => {
        const team = seedTeam(ctx, { name: "Sourcing Team" });
        seedUser(ctx, { email: "user@basischina.com", team_id: team.id });

        mockSession.value = { user: { id: 1 } };
        mockParams.values["id"] = String(team.id);
        mockBody.value = {
            project: {
                sourcing: "Used open-source assets from example.com",
            },
        };

        const result = await handler(createEvent());

        expect(result).toEqual({ message: "Updated your team & project" });

        const updated = ctx.drizzle.select().from(teams).where(eq(teams.id, team.id)).get();
        expect(updated!.sourcing).toBe("Used open-source assets from example.com");
    });
});

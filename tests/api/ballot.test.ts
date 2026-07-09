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
    seedTeam,
    type TestContext,
} from "./helpers";
import { eq } from "drizzle-orm";
import { peerVotingScores } from "~~/server/database/schema";

// The summary handler explicitly imports requireUser, so vi.mock is needed for it.
// The get/post handlers use requireUser as a Nitro auto-import (global), so they
// use the global stub set up by setupNitroGlobals.
vi.mock("~~/server/utils/auth", () => ({
    requireUser: vi.fn(),
    requireJudge: vi.fn(),
    requireAdmin: vi.fn(),
    requirePermission: vi.fn(),
}));

let ctx: TestContext;
let getBallotHandler: any;
let postBallotHandler: any;
let summaryHandler: any;

beforeAll(async () => {
    setupNitroGlobals();

    const teamsDb = await import("~~/server/utils/database/teams");
    vi.stubGlobal("getTeam", teamsDb.getTeam);
    vi.stubGlobal("getSubmittedTeams", teamsDb.getSubmittedTeams);

    const hackathonDb = await import("~~/server/utils/database/hackathon");
    vi.stubGlobal("getHackathon", hackathonDb.getHackathon);

    const seasonsDb = await import("~~/server/utils/database/seasons");
    vi.stubGlobal("getActiveSeason", seasonsDb.getActiveSeason);

    const peerDb = await import("~~/server/utils/database/peer-voting");
    vi.stubGlobal("getPeerVoteByUser", peerDb.getPeerVoteByUser);
    vi.stubGlobal("upsertPeerVote", peerDb.upsertPeerVote);

    const { convertTeamToPublic } = await import("~~/server/utils/convert");
    vi.stubGlobal("convertTeamToPublic", convertTeamToPublic);

    getBallotHandler = (await import("~~/server/api/ballot/index.get")).default;
    postBallotHandler = (await import("~~/server/api/ballot/index.post")).default;
    summaryHandler = (await import("~~/server/api/ballot/summary.get")).default;
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

describe("GET /api/ballot", () => {
    it("returns 409 when hackathon is not in voting phase", async () => {
        vi.mocked(globalThis.requireUser).mockResolvedValue({
            id: 1,
            team_id: 1,
            role: "participant",
        });

        await expect(getBallotHandler(createEvent())).rejects.toMatchObject({ statusCode: 409 });
    });

    it("returns 403 when user has no team", async () => {
        resetTestContext(ctx);
        seedHackathon(ctx, { status: "voting" });
        seedSeason(ctx);

        vi.mocked(globalThis.requireUser).mockResolvedValue({
            id: 1,
            team_id: null,
            role: "participant",
        });

        await expect(getBallotHandler(createEvent())).rejects.toMatchObject({ statusCode: 403 });
    });

    it("returns eligible projects and scores for a voter", async () => {
        resetTestContext(ctx);
        seedHackathon(ctx, { status: "voting" });
        const season = seedSeason(ctx);

        const userTeam = seedTeam(ctx, {
            name: "My Team",
            project_submitted: 1,
            pathway: "junior",
            season_id: season.id,
        });
        seedUser(ctx, { email: "voter@basischina.com", team_id: userTeam.id });

        // Create another submitted team in the same pathway
        seedTeam(ctx, {
            name: "Other Team",
            project_submitted: 1,
            pathway: "junior",
            season_id: season.id,
        });

        vi.mocked(globalThis.requireUser).mockResolvedValue({
            id: 1,
            team_id: userTeam.id,
            role: "participant",
        });

        const result = await getBallotHandler(createEvent());

        expect(result).toHaveProperty("submitted", false);
        expect(result).toHaveProperty("projects");
        expect(result.projects).toHaveLength(1);
        expect(result).toHaveProperty("scores");
        expect(result).toHaveProperty("reasoning");
    });
});

describe("POST /api/ballot", () => {
    it("submits a peer vote", async () => {
        resetTestContext(ctx);
        seedHackathon(ctx, { status: "voting" });
        const season = seedSeason(ctx);

        const userTeam = seedTeam(ctx, {
            name: "My Team",
            project_submitted: 1,
            pathway: "junior",
            season_id: season.id,
        });
        seedUser(ctx, { email: "voter@basischina.com", team_id: userTeam.id });

        seedTeam(ctx, {
            name: "Other Team",
            project_submitted: 1,
            pathway: "junior",
            season_id: season.id,
        });

        vi.mocked(globalThis.requireUser).mockResolvedValue({
            id: 1,
            team_id: userTeam.id,
            role: "participant",
        });

        mockBody.value = {
            scores: [10],
            reasoning: "Great project overall.",
        };

        const result = await postBallotHandler(createEvent());

        expect(result).toEqual({ message: "Successfully submitted vote!" });

        const vote = ctx.drizzle
            .select()
            .from(peerVotingScores)
            .where(eq(peerVotingScores.user_id, 1))
            .get();
        expect(vote).toBeTruthy();
        expect(vote!.reasoning).toBe("Great project overall.");
    });

    it("upserts when user has already voted", async () => {
        resetTestContext(ctx);
        seedHackathon(ctx, { status: "voting" });
        const season = seedSeason(ctx);

        const userTeam = seedTeam(ctx, {
            name: "My Team",
            project_submitted: 1,
            pathway: "junior",
            season_id: season.id,
        });
        seedUser(ctx, { email: "voter@basischina.com", team_id: userTeam.id });

        seedTeam(ctx, {
            name: "Other Team",
            project_submitted: 1,
            pathway: "junior",
            season_id: season.id,
        });

        // Pre-seed a vote
        ctx.drizzle
            .insert(peerVotingScores)
            .values({ user_id: 1, score: "{}", reasoning: "Already voted" })
            .run();

        vi.mocked(globalThis.requireUser).mockResolvedValue({
            id: 1,
            team_id: userTeam.id,
            role: "participant",
        });

        mockBody.value = {
            scores: [10],
            reasoning: "Great project.",
        };

        const result = await postBallotHandler(createEvent());

        expect(result).toEqual({ message: "Successfully submitted vote!" });

        const rows = ctx.drizzle.select().from(peerVotingScores).all();
        expect(rows).toHaveLength(1);
        expect(rows[0].reasoning).toBe("Great project.");
    });
});

describe("GET /api/ballot/summary", () => {
    it("returns ballot summary for the user", async () => {
        const { requireUser } = await import("~~/server/utils/auth");
        (requireUser as any).mockResolvedValue({ id: 1, role: "judge" });

        const result = await summaryHandler(createEvent());

        expect(result).toHaveProperty("current");
        expect(result).toHaveProperty("past");
        expect(Array.isArray(result.past)).toBe(true);
    });
});

import {
    createTestContext,
    resetTestContext,
    resetMockState,
    setupNitroGlobals,
    mockBody,
    mockSession,
    seedHackathon,
    seedSeason,
    seedUser,
    type TestContext,
} from "./helpers";
import { scVotes, hackathon } from "~~/server/database/schema";
import { eq } from "drizzle-orm";

vi.mock("~~/server/utils/rateLimit", () => ({
    applyRateLimit: (fn: any) => fn,
}));

let ctx: TestContext;
let candidatesHandler: any;
let voteGetHandler: any;
let votePostHandler: any;
let electionPositions: any;

beforeAll(async () => {
    setupNitroGlobals();

    ({ electionPositions } = await import("~~/server/utils/election"));
    vi.stubGlobal("electionPositions", electionPositions);

    candidatesHandler = (await import("~~/server/api/election/candidates.get")).default;
    voteGetHandler = (await import("~~/server/api/election/vote/index.get")).default;
    votePostHandler = (await import("~~/server/api/election/vote/index.post")).default;
});

beforeEach(async () => {
    resetMockState();
    ctx = await createTestContext();
    seedHackathon(ctx);
    seedSeason(ctx);
    seedUser(ctx, { email: "voter@basischina.com" });
});

afterEach(() => {
    resetTestContext(ctx);
});

function createEvent(overrides: Record<string, unknown> = {}) {
    return {
        context: { db: ctx.db, drizzle: ctx.drizzle },
        ...overrides,
    };
}

describe("GET /api/election/candidates", () => {
    it("returns election positions with candidates", async () => {
        vi.mocked(globalThis.requirePermission).mockResolvedValue({ id: 1, role: "participant" });

        const result = await candidatesHandler(createEvent());

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0]).toHaveProperty("title");
        expect(result[0]).toHaveProperty("candidates");
    });

    it("requires VOTE permission", async () => {
        vi.mocked(globalThis.requirePermission).mockRejectedValue(
            Object.assign(new Error("Insufficient permissions"), { statusCode: 403 }),
        );

        await expect(candidatesHandler(createEvent())).rejects.toMatchObject({ statusCode: 403 });
    });
});

describe("GET /api/election/vote", () => {
    it("returns IRV election results", async () => {
        vi.mocked(globalThis.requirePermission).mockResolvedValue({ id: 1, role: "participant" });

        const result = await voteGetHandler(createEvent());

        expect(result).toHaveProperty("totalBallots", 0);
        expect(result).toHaveProperty("positions");
        expect(Array.isArray(result.positions)).toBe(true);
    });
});

describe("GET /api/election/vote (results gating)", () => {
    // Helper: seed a single ballot voting for the President candidate (id 10926)
    function seedBallot(ctx: TestContext, userId = 1) {
        ctx.drizzle
            .insert(scVotes)
            .values({
                user_id: userId,
                vote: JSON.stringify({ "10926": 1 }),
                submitted_at: Math.floor(Date.now() / 1000),
            })
            .run();
    }

    it("returns no_votes status with no winner when results_open_timestamp is in the future", async () => {
        vi.mocked(globalThis.requirePermission).mockResolvedValue({ id: 1, role: "participant" });

        // Default seeded hackathon has results_open_timestamp well in the future
        seedBallot(ctx);

        const result = await voteGetHandler(createEvent());

        expect(result.totalBallots).toBe(1);
        expect(result.positions).toHaveLength(electionPositions.length);
        for (const position of result.positions) {
            expect(position.status).toBe("no_votes");
            expect(position.winner).toBeUndefined();
            expect(position.details).toBeUndefined();
        }
    });

    it("returns full IRV results when results_open_timestamp is in the past", async () => {
        vi.mocked(globalThis.requirePermission).mockResolvedValue({ id: 1, role: "participant" });

        // Move results_open_timestamp into the past so results are unlocked
        ctx.drizzle
            .update(hackathon)
            .set({ results_open_timestamp: Date.now() - 1000 })
            .where(eq(hackathon.id, 1))
            .run();

        seedBallot(ctx);

        const result = await voteGetHandler(createEvent());

        expect(result.totalBallots).toBe(1);
        expect(result.positions).toHaveLength(electionPositions.length);

        // The President position has a single candidate (Alice Wu), so with one
        // ballot she must be elected outright.
        const president = result.positions.find((p: any) => p.title === "President");
        expect(president).toBeDefined();
        expect(president.status).toBe("elected");
        expect(president.winner).toBe("Alice Wu");
    });
});

describe("POST /api/election/vote", () => {
    it("submits an election vote", async () => {
        (globalThis as any).requirePermission.mockResolvedValue({ id: 1, role: "participant" });

        mockSession.value = { user: { id: 1 } };

        // Build a valid vote payload based on actual election positions
        const { electionPositions } = await import("~~/server/utils/election");
        const positions = electionPositions.map((pos: any) => ({
            title: pos.title,
            candidates: pos.candidates.map((c: any, i: number) => ({
                id: c.id,
                rank: i + 1,
            })),
        }));

        mockBody.value = { positions };

        const result = await votePostHandler(createEvent());

        expect(result).toEqual({ message: "Vote submitted successfully" });
    });
});

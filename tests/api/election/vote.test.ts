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
} from "~~/tests/api/helpers";
import { scVotes } from "~~/server/database/schema";
import { electionPositions } from "~~/server/utils/election";

let ctx: TestContext;
let voteHandler: any;

beforeAll(async () => {
    setupNitroGlobals();

    voteHandler = (await import("~~/server/api/election/vote/index.post")).default;
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

function buildFullVote() {
    return {
        positions: electionPositions.map((pos) => ({
            title: pos.title,
            candidates: pos.candidates.map((c, i) => ({
                id: c.id,
                rank: i + 1,
            })),
        })),
    };
}

describe("POST /api/election/vote", () => {
    it("upserts a vote so only the latest submission is kept", async () => {
        vi.mocked(globalThis.requirePermission).mockResolvedValue({ id: 1, role: "participant" });
        mockSession.value = { user: { id: 1 } };

        mockBody.value = buildFullVote();
        await voteHandler(createEvent());

        // Submit again with reversed ranks
        const reversed = {
            positions: electionPositions.map((pos) => ({
                title: pos.title,
                candidates: [...pos.candidates].reverse().map((c, i) => ({
                    id: c.id,
                    rank: i + 1,
                })),
            })),
        };
        mockBody.value = reversed;
        await voteHandler(createEvent());

        const rows = ctx.drizzle.select().from(scVotes).all();
        expect(rows).toHaveLength(1);
        expect(rows[0].user_id).toBe(1);
    });

    it("rejects a vote with unknown candidate ID", async () => {
        vi.mocked(globalThis.requirePermission).mockResolvedValue({ id: 1, role: "participant" });

        mockBody.value = {
            positions: electionPositions.map((pos) => ({
                title: pos.title,
                candidates: pos.candidates.map((c, i) => ({
                    id: c.id,
                    rank: i + 1,
                })),
            })),
        };
        // Tamper with one candidate ID
        mockBody.value.positions[0].candidates[0].id = "fake_id";

        await expect(voteHandler(createEvent())).rejects.toMatchObject({ statusCode: 400 });
    });

    it("rejects a vote with wrong number of positions", async () => {
        vi.mocked(globalThis.requirePermission).mockResolvedValue({ id: 1, role: "participant" });

        mockBody.value = {
            positions: [electionPositions[0]],
        };

        await expect(voteHandler(createEvent())).rejects.toMatchObject({ statusCode: 400 });
    });
});

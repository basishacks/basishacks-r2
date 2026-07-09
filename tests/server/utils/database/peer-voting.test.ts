import { describe, it, expect, beforeEach } from "vitest";
import { createMockEvent } from "./helpers";
import { getPeerVoteByUser, upsertPeerVote } from "~~/server/utils/database/peer-voting";

describe("peer-voting database helpers", () => {
    let event: Awaited<ReturnType<typeof createMockEvent>>;

    beforeEach(async () => {
        event = await createMockEvent();
    });

    describe("getPeerVoteByUser", () => {
        it("returns the vote when the user has one", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO peer_voting_scores(user_id, score, reasoning) VALUES(1, '{\"team1\":4}', 'Good picks')",
                )
                .run();

            const vote = await getPeerVoteByUser(event, 1);
            expect(vote).not.toBeNull();
            expect(vote!.user_id).toBe(1);
            expect(vote!.score).toBe('{"team1":4}');
            expect(vote!.reasoning).toBe("Good picks");
        });

        it("returns null when the user has no vote", async () => {
            const vote = await getPeerVoteByUser(event, 1);
            expect(vote).toBeNull();
        });
    });

    describe("upsertPeerVote", () => {
        it("creates a peer vote successfully", async () => {
            await upsertPeerVote(event, {
                user_id: 1,
                score: '{"team1":5,"team2":3}',
                reasoning: "Well reasoned",
            });

            const vote = await getPeerVoteByUser(event, 1);
            expect(vote).not.toBeNull();
            expect(vote!.user_id).toBe(1);
            expect(vote!.score).toBe('{"team1":5,"team2":3}');
            expect(vote!.reasoning).toBe("Well reasoned");
        });

        it("upserts an existing peer vote", async () => {
            await upsertPeerVote(event, {
                user_id: 1,
                score: '{"team1":5}',
                reasoning: "First",
            });
            await upsertPeerVote(event, {
                user_id: 1,
                score: '{"team1":4}',
                reasoning: "Second",
            });

            const rows = event.context.drizzle
                .prepare("SELECT * FROM peer_voting_scores WHERE user_id = 1")
                .all() as { results: any[] };
            expect(rows.results).toHaveLength(1);

            const vote = await getPeerVoteByUser(event, 1);
            expect(vote).not.toBeNull();
            expect(vote!.score).toBe('{"team1":4}');
            expect(vote!.reasoning).toBe("Second");
        });
    });
});

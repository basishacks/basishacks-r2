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

        it("returns the correct vote when multiple users have votes", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO peer_voting_scores(user_id, score, reasoning) VALUES(1, '{\"team1\":4}', 'User 1')",
                )
                .run();
            event.context.drizzle
                .prepare(
                    "INSERT INTO peer_voting_scores(user_id, score, reasoning) VALUES(2, '{\"team2\":5}', 'User 2')",
                )
                .run();

            const vote = await getPeerVoteByUser(event, 2);
            expect(vote!.user_id).toBe(2);
            expect(vote!.score).toBe('{"team2":5}');
        });

        it("returns null for a non-existent user id", async () => {
            const vote = await getPeerVoteByUser(event, 999);
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

        it("upserts with null reasoning", async () => {
            await upsertPeerVote(event, {
                user_id: 1,
                score: '{"team1":3}',
                reasoning: null as any,
            });

            const vote = await getPeerVoteByUser(event, 1);
            expect(vote).not.toBeNull();
            expect(vote!.score).toBe('{"team1":3}');
            expect(vote!.reasoning).toBeNull();
        });

        it("upserts with an empty score string", async () => {
            await upsertPeerVote(event, {
                user_id: 1,
                score: "",
                reasoning: "Empty scores",
            });

            const vote = await getPeerVoteByUser(event, 1);
            expect(vote!.score).toBe("");
            expect(vote!.reasoning).toBe("Empty scores");
        });

        it("upserts with a complex JSON score string", async () => {
            await upsertPeerVote(event, {
                user_id: 1,
                score: '{"team1":5,"team2":3,"team3":4}',
                reasoning: "Distributed votes",
            });

            const vote = await getPeerVoteByUser(event, 1);
            expect(vote!.score).toBe('{"team1":5,"team2":3,"team3":4}');
        });

        it("ensures only one row per user after multiple upserts", async () => {
            await upsertPeerVote(event, { user_id: 1, score: '{"a":1}', reasoning: "A" });
            await upsertPeerVote(event, { user_id: 1, score: '{"b":2}', reasoning: "B" });
            await upsertPeerVote(event, { user_id: 1, score: '{"c":3}', reasoning: "C" });

            const rows = event.context.drizzle
                .prepare("SELECT * FROM peer_voting_scores WHERE user_id = 1")
                .all() as { results: any[] };
            expect(rows.results).toHaveLength(1);
            expect(rows.results[0]!.score).toBe('{"c":3}');
        });

        it("creates separate votes for different users", async () => {
            await upsertPeerVote(event, { user_id: 1, score: '{"a":1}', reasoning: "User 1" });
            await upsertPeerVote(event, { user_id: 2, score: '{"b":2}', reasoning: "User 2" });

            const rows = event.context.drizzle
                .prepare("SELECT * FROM peer_voting_scores")
                .all() as { results: any[] };
            expect(rows.results).toHaveLength(2);
        });
    });
});

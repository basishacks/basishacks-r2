import { describe, it, expect, beforeEach } from "vitest";
import { createMockEvent } from "./helpers";
import {
    createBallot,
    getBallotByUser,
    updateBallot,
    createBallotScore,
    getBallotScores,
    getBallotScoresByTeamID,
    updateBallotScore,
} from "~~/server/utils/database/ballots";

describe("ballots database helpers", () => {
    let event: Awaited<ReturnType<typeof createMockEvent>>;

    beforeEach(async () => {
        event = await createMockEvent();
        // Seed a user
        event.context.drizzle.prepare("INSERT INTO users(email) VALUES('user@example.com')").run();
        // Seed hackathon, season, and team for ballot_scores FK
        event.context.drizzle
            .prepare(
                "INSERT INTO hackathon(id, status, start_timestamp, end_timestamp, voting_start_timestamp, voting_end_timestamp, results_open_timestamp) VALUES(1, 'not_started', 0, 0, 0, 0, 0)",
            )
            .run();
        event.context.drizzle.prepare("INSERT INTO seasons(name, is_active) VALUES('S1', 1)").run();
        event.context.drizzle
            .prepare("INSERT INTO teams(name, season_id) VALUES('Team A', 1)")
            .run();
    });

    describe("createBallot", () => {
        it("creates a ballot and returns it with an id", async () => {
            const ballot = await createBallot(event, 1);
            expect(ballot).not.toBeNull();
            expect(ballot.id).toBe(1);
            expect(ballot.user_id).toBe(1);
            expect(ballot.submitted).toBe(0);
        });

        it("creates a ballot for a different user id", async () => {
            event.context.drizzle
                .prepare("INSERT INTO users(email) VALUES('user2@example.com')")
                .run();

            const ballot = await createBallot(event, 2);
            expect(ballot.user_id).toBe(2);
            expect(ballot.id).toBe(1);
        });

        it("sets default submitted to 0 and reasoning to null", async () => {
            const ballot = await createBallot(event, 1);
            expect(ballot.submitted).toBe(0);
            expect(ballot.reasoning).toBeNull();
        });

        it("throws when creating a duplicate ballot for the same user", async () => {
            await createBallot(event, 1);
            await expect(createBallot(event, 1)).rejects.toThrow();
        });
    });

    describe("getBallotByUser", () => {
        it("returns the ballot for a user who has one", async () => {
            event.context.drizzle.prepare("INSERT INTO ballots(user_id) VALUES(1)").run();

            const ballot = await getBallotByUser(event, 1);
            expect(ballot).not.toBeNull();
            expect(ballot!.user_id).toBe(1);
        });

        it("returns null when the user has no ballot", async () => {
            const ballot = await getBallotByUser(event, 1);
            expect(ballot).toBeNull();
        });

        it("returns the correct ballot when multiple users have ballots", async () => {
            event.context.drizzle
                .prepare("INSERT INTO users(email) VALUES('user2@example.com')")
                .run();
            event.context.drizzle.prepare("INSERT INTO ballots(user_id) VALUES(1)").run();
            event.context.drizzle.prepare("INSERT INTO ballots(user_id) VALUES(2)").run();

            const ballot = await getBallotByUser(event, 2);
            expect(ballot).not.toBeNull();
            expect(ballot!.user_id).toBe(2);
        });

        it("returns null for a non-existent user id", async () => {
            const ballot = await getBallotByUser(event, 999);
            expect(ballot).toBeNull();
        });
    });

    describe("updateBallot", () => {
        it("updates the reasoning and submitted fields", async () => {
            event.context.drizzle.prepare("INSERT INTO ballots(user_id) VALUES(1)").run();

            await updateBallot(event, {
                id: 1,
                reasoning: "My reasoning",
                submitted: 1,
            } as any);

            const ballot = await getBallotByUser(event, 1);
            expect(ballot!.reasoning).toBe("My reasoning");
            expect(ballot!.submitted).toBe(1);
        });

        it("throws a 404 error when the ballot does not exist", async () => {
            await expect(
                updateBallot(event, { id: 999, reasoning: "Ghost", submitted: 1 } as any),
            ).rejects.toThrow("Ballot not found");
        });

        it("updates reasoning while submitted stays unchanged", async () => {
            event.context.drizzle
                .prepare("INSERT INTO ballots(user_id, submitted) VALUES(1, 1)")
                .run();

            await updateBallot(event, { id: 1, reasoning: "New reasoning", submitted: 1 } as any);

            const ballot = await getBallotByUser(event, 1);
            expect(ballot!.reasoning).toBe("New reasoning");
            expect(ballot!.submitted).toBe(1);
        });

        it("updates submitted while reasoning stays unchanged", async () => {
            event.context.drizzle
                .prepare("INSERT INTO ballots(user_id, reasoning) VALUES(1, 'Old reasoning')")
                .run();

            await updateBallot(event, {
                id: 1,
                submitted: 1,
            } as any);

            const ballot = await getBallotByUser(event, 1);
            expect(ballot!.submitted).toBe(1);
            expect(ballot!.reasoning).toBe("Old reasoning");
        });
    });

    describe("createBallotScore", () => {
        it("creates a ballot score successfully", async () => {
            event.context.drizzle.prepare("INSERT INTO ballots(user_id) VALUES(1)").run();

            const score = await createBallotScore(event, 1, 1);
            expect(score).not.toBeNull();
            expect(score.ballot_id).toBe(1);
            expect(score.project_id).toBe(1);
            expect(score.score).toBeNull();
        });

        it("creates multiple scores for the same ballot with different project ids", async () => {
            event.context.drizzle.prepare("INSERT INTO ballots(user_id) VALUES(1)").run();
            event.context.drizzle
                .prepare("INSERT INTO teams(name, season_id) VALUES('Team B', 1)")
                .run();

            const score1 = await createBallotScore(event, 1, 1);
            const score2 = await createBallotScore(event, 1, 2);

            expect(score1.project_id).toBe(1);
            expect(score2.project_id).toBe(2);
            expect(score1.id).not.toBe(score2.id);
        });

        it("throws on duplicate ballot_id and project_id combination", async () => {
            event.context.drizzle.prepare("INSERT INTO ballots(user_id) VALUES(1)").run();
            await createBallotScore(event, 1, 1);
            await expect(createBallotScore(event, 1, 1)).rejects.toThrow();
        });

        it("creates scores with different ballot ids and same project id", async () => {
            event.context.drizzle.prepare("INSERT INTO ballots(user_id) VALUES(1)").run();
            event.context.drizzle
                .prepare("INSERT INTO users(email) VALUES('user2@example.com')")
                .run();
            event.context.drizzle.prepare("INSERT INTO ballots(user_id) VALUES(2)").run();

            const score1 = await createBallotScore(event, 1, 1);
            const score2 = await createBallotScore(event, 2, 1);

            expect(score1.ballot_id).toBe(1);
            expect(score2.ballot_id).toBe(2);
            expect(score1.project_id).toBe(1);
            expect(score2.project_id).toBe(1);
        });
    });

    describe("getBallotScores", () => {
        it("returns scores for a ballot that has them", async () => {
            event.context.drizzle.prepare("INSERT INTO ballots(user_id) VALUES(1)").run();
            event.context.drizzle
                .prepare("INSERT INTO ballot_scores(ballot_id, project_id, score) VALUES(1, 1, 4)")
                .run();

            const scores = await getBallotScores(event, 1);
            expect(scores).toHaveLength(1);
            expect(scores[0]!.ballot_id).toBe(1);
            expect(scores[0]!.project_id).toBe(1);
            expect(scores[0]!.score).toBe(4);
        });

        it("returns an empty array when the ballot has no scores", async () => {
            event.context.drizzle.prepare("INSERT INTO ballots(user_id) VALUES(1)").run();

            const scores = await getBallotScores(event, 1);
            expect(scores).toHaveLength(0);
        });

        it("returns multiple scores for a ballot", async () => {
            event.context.drizzle.prepare("INSERT INTO ballots(user_id) VALUES(1)").run();
            event.context.drizzle
                .prepare("INSERT INTO teams(name, season_id) VALUES('Team B', 1)")
                .run();
            event.context.drizzle
                .prepare(
                    "INSERT INTO ballot_scores(ballot_id, project_id, score) VALUES(1, 1, 4), (1, 2, 3)",
                )
                .run();

            const scores = await getBallotScores(event, 1);
            expect(scores).toHaveLength(2);
        });

        it("returns an empty array for a non-existent ballot id", async () => {
            const scores = await getBallotScores(event, 999);
            expect(scores).toHaveLength(0);
        });
    });

    describe("getBallotScoresByTeamID", () => {
        it("returns scores for a specific team", async () => {
            event.context.drizzle.prepare("INSERT INTO ballots(user_id) VALUES(1)").run();
            event.context.drizzle
                .prepare("INSERT INTO ballot_scores(ballot_id, project_id, score) VALUES(1, 1, 5)")
                .run();

            const scores = await getBallotScoresByTeamID(event, 1);
            expect(scores).toHaveLength(1);
            expect(scores[0]!.project_id).toBe(1);
            expect(scores[0]!.score).toBe(5);
        });

        it("returns an empty array when no scores exist for the team", async () => {
            const scores = await getBallotScoresByTeamID(event, 1);
            expect(scores).toHaveLength(0);
        });

        it("returns multiple scores for the same team", async () => {
            event.context.drizzle
                .prepare("INSERT INTO users(email) VALUES('user2@example.com')")
                .run();
            event.context.drizzle.prepare("INSERT INTO ballots(user_id) VALUES(1)").run();
            event.context.drizzle.prepare("INSERT INTO ballots(user_id) VALUES(2)").run();
            event.context.drizzle
                .prepare(
                    "INSERT INTO ballot_scores(ballot_id, project_id, score) VALUES(1, 1, 5), (2, 1, 4)",
                )
                .run();

            const scores = await getBallotScoresByTeamID(event, 1);
            expect(scores).toHaveLength(2);
        });

        it("returns only scores for the requested team, not others", async () => {
            event.context.drizzle.prepare("INSERT INTO ballots(user_id) VALUES(1)").run();
            event.context.drizzle
                .prepare("INSERT INTO teams(name, season_id) VALUES('Team B', 1)")
                .run();
            event.context.drizzle
                .prepare(
                    "INSERT INTO ballot_scores(ballot_id, project_id, score) VALUES(1, 1, 5), (1, 2, 3)",
                )
                .run();

            const scores = await getBallotScoresByTeamID(event, 1);
            expect(scores).toHaveLength(1);
            expect(scores[0]!.project_id).toBe(1);
        });

        it("returns empty array for a non-existent team id", async () => {
            const scores = await getBallotScoresByTeamID(event, 999);
            expect(scores).toHaveLength(0);
        });
    });

    describe("updateBallotScore", () => {
        it("updates a ballot score successfully", async () => {
            event.context.drizzle.prepare("INSERT INTO ballots(user_id) VALUES(1)").run();
            event.context.drizzle
                .prepare("INSERT INTO ballot_scores(ballot_id, project_id, score) VALUES(1, 1, 3)")
                .run();

            await updateBallotScore(event, { id: 1, score: 5 } as any);

            const scores = await getBallotScores(event, 1);
            expect(scores[0]!.score).toBe(5);
        });

        it("throws a 404 error when the ballot score does not exist", async () => {
            await expect(updateBallotScore(event, { id: 999, score: 5 } as any)).rejects.toThrow(
                "Ballot score not found",
            );
        });

        it("updates a ballot score to a different value", async () => {
            event.context.drizzle.prepare("INSERT INTO ballots(user_id) VALUES(1)").run();
            event.context.drizzle
                .prepare("INSERT INTO ballot_scores(ballot_id, project_id, score) VALUES(1, 1, 3)")
                .run();

            await updateBallotScore(event, { id: 1, score: 2 } as any);

            const scores = await getBallotScores(event, 1);
            expect(scores[0]!.score).toBe(2);
        });

        it("updates a ballot score to null", async () => {
            event.context.drizzle.prepare("INSERT INTO ballots(user_id) VALUES(1)").run();
            event.context.drizzle
                .prepare("INSERT INTO ballot_scores(ballot_id, project_id, score) VALUES(1, 1, 4)")
                .run();

            await updateBallotScore(event, { id: 1, score: null } as any);

            const scores = await getBallotScores(event, 1);
            expect(scores[0]!.score).toBeNull();
        });

        it("updating with the same score does not error", async () => {
            event.context.drizzle.prepare("INSERT INTO ballots(user_id) VALUES(1)").run();
            event.context.drizzle
                .prepare("INSERT INTO ballot_scores(ballot_id, project_id, score) VALUES(1, 1, 3)")
                .run();

            await updateBallotScore(event, { id: 1, score: 3 } as any);

            const scores = await getBallotScores(event, 1);
            expect(scores[0]!.score).toBe(3);
        });
    });
});

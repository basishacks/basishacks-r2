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
        event.context.db.prepare("INSERT INTO users(email) VALUES('user@example.com')").run();
        // Seed hackathon, season, and team for ballot_scores FK
        event.context.db
            .prepare(
                "INSERT INTO hackathon(id, status, start_timestamp, end_timestamp, voting_start_timestamp, voting_end_timestamp, results_open_timestamp) VALUES(1, 'not_started', 0, 0, 0, 0, 0)",
            )
            .run();
        event.context.db.prepare("INSERT INTO seasons(name, is_active) VALUES('S1', 1)").run();
        event.context.db.prepare("INSERT INTO teams(name, season_id) VALUES('Team A', 1)").run();
    });

    describe("createBallot", () => {
        it("creates a ballot and returns it with an id", async () => {
            const ballot = await createBallot(event, 1);
            expect(ballot).not.toBeNull();
            expect(ballot.id).toBe(1);
            expect(ballot.user_id).toBe(1);
            expect(ballot.submitted).toBe(0);
        });
    });

    describe("getBallotByUser", () => {
        it("returns the ballot for a user who has one", async () => {
            event.context.db.prepare("INSERT INTO ballots(user_id) VALUES(1)").run();

            const ballot = await getBallotByUser(event, 1);
            expect(ballot).not.toBeNull();
            expect(ballot!.user_id).toBe(1);
        });

        it("returns null when the user has no ballot", async () => {
            const ballot = await getBallotByUser(event, 1);
            expect(ballot).toBeNull();
        });
    });

    describe("updateBallot", () => {
        it("updates the reasoning and submitted fields", async () => {
            event.context.db.prepare("INSERT INTO ballots(user_id) VALUES(1)").run();

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
    });

    describe("createBallotScore", () => {
        it("creates a ballot score successfully", async () => {
            event.context.db.prepare("INSERT INTO ballots(user_id) VALUES(1)").run();

            const score = await createBallotScore(event, 1, 1);
            expect(score).not.toBeNull();
            expect(score.ballot_id).toBe(1);
            expect(score.project_id).toBe(1);
            expect(score.score).toBeNull();
        });
    });

    describe("getBallotScores", () => {
        it("returns scores for a ballot that has them", async () => {
            event.context.db.prepare("INSERT INTO ballots(user_id) VALUES(1)").run();
            event.context.db
                .prepare("INSERT INTO ballot_scores(ballot_id, project_id, score) VALUES(1, 1, 4)")
                .run();

            const scores = await getBallotScores(event, 1);
            expect(scores).toHaveLength(1);
            expect(scores[0]!.ballot_id).toBe(1);
            expect(scores[0]!.project_id).toBe(1);
            expect(scores[0]!.score).toBe(4);
        });

        it("returns an empty array when the ballot has no scores", async () => {
            event.context.db.prepare("INSERT INTO ballots(user_id) VALUES(1)").run();

            const scores = await getBallotScores(event, 1);
            expect(scores).toHaveLength(0);
        });
    });

    describe("getBallotScoresByTeamID", () => {
        it("returns scores for a specific team", async () => {
            event.context.db.prepare("INSERT INTO ballots(user_id) VALUES(1)").run();
            event.context.db
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
    });

    describe("updateBallotScore", () => {
        it("updates a ballot score successfully", async () => {
            event.context.db.prepare("INSERT INTO ballots(user_id) VALUES(1)").run();
            event.context.db
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
    });
});

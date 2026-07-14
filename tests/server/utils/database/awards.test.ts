import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createMockEvent } from "./helpers";
import {
    getAwards,
    getAwardsForTeams,
    createAward,
    deleteTeamAwards,
    deleteAward,
} from "~~/server/utils/database/awards";
import { AWARD_REGISTRY, type Award } from "~~/shared/awards";

describe("awards database helpers", () => {
    let event: Awaited<ReturnType<typeof createMockEvent>>;

    beforeEach(async () => {
        event = await createMockEvent();
        // Seed hackathon, season, and teams
        event.context.drizzle
            .prepare(
                "INSERT INTO hackathon(id, status, start_timestamp, end_timestamp, voting_start_timestamp, voting_end_timestamp, results_open_timestamp) VALUES(1, 'not_started', 0, 0, 0, 0, 0)",
            )
            .run();
        event.context.drizzle.prepare("INSERT INTO seasons(name, is_active) VALUES('S1', 1)").run();
        event.context.drizzle
            .prepare("INSERT INTO teams(name, season_id) VALUES('Team A', 1)")
            .run();
        event.context.drizzle
            .prepare("INSERT INTO teams(name, season_id) VALUES('Team B', 1)")
            .run();
    });

    afterEach(() => {
        // Clean up any temporary awards registered by individual tests
        delete AWARD_REGISTRY["unknown_award"];
        delete AWARD_REGISTRY["computed_award"];
    });

    describe("getAwards", () => {
        it("returns awards for a team that has them", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO team_awards(team_id, award, meta) VALUES(1, 'perfect_score', '{}')",
                )
                .run();

            const awards = await getAwards(event, 1);
            expect(awards).toHaveLength(1);
            expect(awards[0]!.team_id).toBe(1);
            expect(awards[0]!.namespace).toBe("perfect_score");
            expect(awards[0]!.name).toBe("Flawless");
        });

        it("returns an empty array for a team with no awards", async () => {
            const awards = await getAwards(event, 1);
            expect(awards).toHaveLength(0);
        });

        it("falls back to empty meta when stored meta is invalid JSON", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO team_awards(team_id, award, meta) VALUES(1, 'perfect_score', 'not-json')",
                )
                .run();

            const awards = await getAwards(event, 1);
            expect(awards).toHaveLength(1);
            expect(awards[0]!.meta).toEqual({});
        });

        it("falls back to namespace defaults for awards not in the registry", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO team_awards(team_id, award, meta) VALUES(1, 'unknown_award', '{}')",
                )
                .run();

            const awards = await getAwards(event, 1);
            expect(awards).toHaveLength(1);
            expect(awards[0]!.name).toBe("unknown_award");
            expect(awards[0]!.description).toBe("unknown_award");
            expect(awards[0]!.icon).toBe("i-lucide-award");
            expect(awards[0]!.color).toBe("gold");
            expect(awards[0]!.text).toBe("unknown_award");
        });

        it("uses a computed text function when present", async () => {
            AWARD_REGISTRY["computed_award"] = {
                namespace: "computed_award",
                name: "Computed",
                description: "A computed award",
                icon: "i-lucide-star",
                computed: (meta: Record<string, unknown>) => [`by ${meta.by}`],
            } as Award;

            event.context.drizzle
                .prepare(
                    "INSERT INTO team_awards(team_id, award, meta) VALUES(1, 'computed_award', '{\"by\":\"judge\"}')",
                )
                .run();

            const awards = await getAwards(event, 1);
            expect(awards).toHaveLength(1);
            expect(awards[0]!.text).toBe("by judge");
        });
    });

    describe("getAwardsForTeams", () => {
        it("returns awards for multiple teams", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO team_awards(team_id, award, meta) VALUES(1, 'perfect_score', '{}')",
                )
                .run();
            event.context.drizzle
                .prepare(
                    "INSERT INTO team_awards(team_id, award, meta) VALUES(2, 'perfect_score', '{}')",
                )
                .run();

            const awards = await getAwardsForTeams(event, [1, 2]);
            expect(Object.keys(awards)).toHaveLength(2);
            expect(awards[1]).toHaveLength(1);
            expect(awards[2]).toHaveLength(1);
        });

        it("returns an empty object for empty team IDs", async () => {
            const awards = await getAwardsForTeams(event, []);
            expect(awards).toEqual({});
        });

        it("groups multiple awards for the same team", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO team_awards(team_id, award, meta) VALUES(1, 'perfect_score', '{}')",
                )
                .run();
            event.context.drizzle
                .prepare("INSERT INTO team_awards(team_id, award, meta) VALUES(1, 'best_ui', '{}')")
                .run();

            const awards = await getAwardsForTeams(event, [1]);
            expect(awards[1]).toHaveLength(2);
        });
    });

    describe("createAward", () => {
        it("creates an award with meta data", async () => {
            const award = await createAward(event, 1, "perfect_score", '{"by":"judge1"}');

            expect(award).not.toBeNull();
            expect(award.team_id).toBe(1);
            expect(award.award).toBe("perfect_score");
            expect(award.meta).toBe('{"by":"judge1"}');
        });

        it("defaults meta to an empty object when not provided", async () => {
            const award = await createAward(event, 1, "perfect_score");

            expect(award.meta).toBe("{}");
        });
    });

    describe("deleteTeamAwards", () => {
        it("removes all awards for a team", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO team_awards(team_id, award, meta) VALUES(1, 'perfect_score', '{}')",
                )
                .run();
            event.context.drizzle
                .prepare(
                    "INSERT INTO team_awards(team_id, award, meta) VALUES(1, 'custom_award', '{}')",
                )
                .run();

            await deleteTeamAwards(event, 1);

            const awards = await getAwards(event, 1);
            expect(awards).toHaveLength(0);
        });
    });

    describe("deleteAward", () => {
        it("removes a specific award for a team", async () => {
            event.context.drizzle
                .prepare("INSERT INTO team_awards(team_id, award, meta) VALUES(1, 'award_a', '{}')")
                .run();
            event.context.drizzle
                .prepare("INSERT INTO team_awards(team_id, award, meta) VALUES(1, 'award_b', '{}')")
                .run();

            await deleteAward(event, 1, "award_a");

            const awards = await getAwards(event, 1);
            expect(awards).toHaveLength(1);
            expect(awards[0]!.namespace).toBe("award_b");
        });

        it("silently succeeds when the award does not exist", async () => {
            // Should not throw
            await expect(deleteAward(event, 1, "nonexistent")).resolves.toBeUndefined();
        });
    });
});

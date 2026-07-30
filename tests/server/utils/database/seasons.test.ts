import { describe, it, expect, beforeEach } from "vitest";
import { createMockEvent } from "./helpers";
import {
    getSeasons,
    getSeasonById,
    getActiveSeason,
    setActiveSeason,
    updateSeasonTweaks,
} from "~~/server/utils/database/seasons";

describe("seasons database helpers", () => {
    let event: Awaited<ReturnType<typeof createMockEvent>>;

    beforeEach(async () => {
        event = await createMockEvent();
    });

    describe("getSeasons", () => {
        it("returns all seasons ordered by id", async () => {
            event.context.drizzle
                .prepare("INSERT INTO seasons(name, is_active) VALUES('Season 1', 0)")
                .run();
            event.context.drizzle
                .prepare("INSERT INTO seasons(name, is_active) VALUES('Season 2', 1)")
                .run();

            const seasons = await getSeasons(event);
            expect(seasons).toHaveLength(2);
            expect(seasons[0]!.name).toBe("Season 1");
            expect(seasons[1]!.name).toBe("Season 2");
        });

        it("returns an empty array when there are no seasons", async () => {
            const seasons = await getSeasons(event);
            expect(seasons).toHaveLength(0);
        });
    });

    describe("getSeasonById", () => {
        it("returns the season when it exists", async () => {
            event.context.drizzle
                .prepare("INSERT INTO seasons(name, is_active) VALUES('Season 1', 1)")
                .run();

            const season = await getSeasonById(event, 1);
            expect(season).not.toBeNull();
            expect(season!.name).toBe("Season 1");
        });

        it("returns null when the season does not exist", async () => {
            const season = await getSeasonById(event, 999);
            expect(season).toBeNull();
        });
    });

    describe("getActiveSeason", () => {
        it("returns the active season when one exists", async () => {
            event.context.drizzle
                .prepare("INSERT INTO seasons(name, is_active) VALUES('Inactive', 0)")
                .run();
            event.context.drizzle
                .prepare("INSERT INTO seasons(name, is_active) VALUES('Active', 1)")
                .run();

            const season = await getActiveSeason(event);
            expect(season).not.toBeNull();
            expect(season!.name).toBe("Active");
        });

        it("returns null when there is no active season", async () => {
            event.context.drizzle
                .prepare("INSERT INTO seasons(name, is_active) VALUES('Inactive', 0)")
                .run();

            const season = await getActiveSeason(event);
            expect(season).toBeNull();
        });
    });

    describe("setActiveSeason", () => {
        it("sets a season as active", async () => {
            event.context.drizzle
                .prepare("INSERT INTO seasons(name, is_active) VALUES('Season 1', 0)")
                .run();

            await setActiveSeason(event, 1);

            const season = await getActiveSeason(event);
            expect(season).not.toBeNull();
            expect(season!.name).toBe("Season 1");
        });

        it("deactivates all seasons when given null", async () => {
            event.context.drizzle
                .prepare("INSERT INTO seasons(name, is_active) VALUES('Season 1', 1)")
                .run();

            await setActiveSeason(event, null);

            const season = await getActiveSeason(event);
            expect(season).toBeNull();
        });

        it("throws a 404 error when setting a non-existing season as active", async () => {
            await expect(setActiveSeason(event, 999)).rejects.toThrow("Season not found");
        });

        it("leaves the active season unchanged when the target season does not exist", async () => {
            event.context.drizzle
                .prepare("INSERT INTO seasons(name, is_active) VALUES('Active', 1)")
                .run();

            await expect(setActiveSeason(event, 999)).rejects.toThrow("Season not found");

            const season = await getActiveSeason(event);
            expect(season).not.toBeNull();
            expect(season!.name).toBe("Active");
        });

        it("copies the newly active season's tweaks into the hackathon row", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO hackathon(id, status, start_timestamp, end_timestamp, voting_start_timestamp, voting_end_timestamp, results_open_timestamp) VALUES(1, 'not_started', 0, 0, 0, 0, 0)",
                )
                .run();
            event.context.drizzle
                .prepare(
                    "INSERT INTO seasons(name, is_active, status, show_scores, show_ranking, theme_name) VALUES('Season 1', 0, 'in_progress', 1, 1, 'Synced Theme')",
                )
                .run();

            await setActiveSeason(event, 1);

            const hackathon = event.context.drizzle
                .prepare("SELECT * FROM hackathon WHERE id = 1")
                .first() as any;
            expect(hackathon.status).toBe("in_progress");
            expect(hackathon.show_scores).toBe(1);
            expect(hackathon.show_ranking).toBe(1);
            // theme_name is not a tweakable field and is not synced
            expect(hackathon.theme_name).toBeNull();
        });
    });

    describe("updateSeasonTweaks", () => {
        it("updates the given fields on the season and returns the updated row", async () => {
            event.context.drizzle
                .prepare("INSERT INTO seasons(name, is_active) VALUES('Season 1', 0)")
                .run();

            const updated = await updateSeasonTweaks(event, 1, {
                status: "voting",
                show_scores: 1,
            });

            expect(updated).not.toBeNull();
            expect(updated!.status).toBe("voting");
            expect(updated!.show_scores).toBe(1);
        });

        it("leaves other fields untouched", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO seasons(name, is_active, status, show_scores) VALUES('Season 1', 0, 'in_progress', 1)",
                )
                .run();

            const updated = await updateSeasonTweaks(event, 1, { show_ranking: 1 });

            expect(updated!.status).toBe("in_progress");
            expect(updated!.show_scores).toBe(1);
            expect(updated!.show_ranking).toBe(1);
        });

        it("returns null when the season does not exist", async () => {
            const updated = await updateSeasonTweaks(event, 999, { show_scores: 1 });
            expect(updated).toBeNull();
        });

        it("also updates the hackathon row when the season is live", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO hackathon(id, status, start_timestamp, end_timestamp, voting_start_timestamp, voting_end_timestamp, results_open_timestamp) VALUES(1, 'not_started', 0, 0, 0, 0, 0)",
                )
                .run();
            event.context.drizzle
                .prepare("INSERT INTO seasons(name, is_active) VALUES('Live', 1)")
                .run();

            await updateSeasonTweaks(event, 1, { show_scores: 1, show_ranking: 1 });

            const hackathon = event.context.drizzle
                .prepare("SELECT * FROM hackathon WHERE id = 1")
                .first() as any;
            expect(hackathon.show_scores).toBe(1);
            expect(hackathon.show_ranking).toBe(1);
        });

        it("does not touch the hackathon row when the season is not live", async () => {
            event.context.drizzle
                .prepare(
                    "INSERT INTO hackathon(id, status, start_timestamp, end_timestamp, voting_start_timestamp, voting_end_timestamp, results_open_timestamp) VALUES(1, 'not_started', 0, 0, 0, 0, 0)",
                )
                .run();
            event.context.drizzle
                .prepare("INSERT INTO seasons(name, is_active) VALUES('Future', 0)")
                .run();

            await updateSeasonTweaks(event, 1, { show_scores: 1 });

            const hackathon = event.context.drizzle
                .prepare("SELECT * FROM hackathon WHERE id = 1")
                .first() as any;
            expect(hackathon.show_scores).toBe(0);
        });
    });
});

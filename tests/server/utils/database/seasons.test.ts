import { describe, it, expect, beforeEach } from "vitest";
import { createMockEvent } from "./helpers";
import {
    getSeasons,
    getSeasonById,
    getActiveSeason,
    setActiveSeason,
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
    });
});

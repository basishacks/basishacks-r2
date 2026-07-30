import type { H3Event } from "h3";
import { eq, asc } from "drizzle-orm";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { SQLiteTransaction } from "drizzle-orm/sqlite-core";
import { hackathon, seasons } from "~~/server/database/schema";

type Schema = typeof import("~~/server/database/schema");

type DbTransaction = SQLiteTransaction<"sync", unknown, Schema, ExtractTablesWithRelations<Schema>>;

/**
 * Per-season tweakable settings. These columns exist on both the `seasons`
 * table (per-season storage) and the `hackathon` singleton (live state for
 * the currently active season).
 */
export const SEASON_TWEAK_FIELDS = [
    "status",
    "voting_enabled",
    "results_published",
    "judging_open",
    "show_scores",
    "show_ranking",
    "max_votes_per_user",
    "schedule_start",
    "schedule_end",
    "start_timestamp",
    "end_timestamp",
    "voting_start_timestamp",
    "voting_end_timestamp",
    "results_open_timestamp",
    "theme_name",
    "theme_description",
] as const;

export type SeasonTweaks = Partial<Pick<Season, (typeof SEASON_TWEAK_FIELDS)[number]>>;

function pickTweaks(source: Record<string, unknown>): Record<string, unknown> {
    const tweaks: Record<string, unknown> = {};
    for (const field of SEASON_TWEAK_FIELDS) {
        if (source[field] !== undefined) {
            tweaks[field] = source[field];
        }
    }
    return tweaks;
}

export async function getSeasons(event: H3Event): Promise<Season[]> {
    return event.context.drizzle.select().from(seasons).orderBy(asc(seasons.id)).all();
}

export async function getSeasonById(event: H3Event, seasonId: number): Promise<Season | null> {
    const row = event.context.drizzle.select().from(seasons).where(eq(seasons.id, seasonId)).get();

    return row ?? null;
}

export async function getActiveSeason(event: H3Event): Promise<Season | null> {
    const row = event.context.drizzle.select().from(seasons).where(eq(seasons.is_active, 1)).get();

    return row ?? null;
}

/**
 * Updates the tweakable settings of a single season. When the season is the
 * currently active (live) season, the hackathon singleton row is updated as
 * well so the changes take effect immediately.
 *
 * Returns the updated season, or null when the season does not exist.
 */
export async function updateSeasonTweaks(
    event: H3Event,
    seasonId: number,
    data: SeasonTweaks,
): Promise<Season | null> {
    const tweaks = pickTweaks(data as Record<string, unknown>);

    return event.context.drizzle.transaction((tx: DbTransaction) => {
        const season = tx.select().from(seasons).where(eq(seasons.id, seasonId)).get();
        if (!season) return null;

        if (Object.keys(tweaks).length > 0) {
            tx.update(seasons).set(tweaks).where(eq(seasons.id, seasonId)).run();

            if (season.is_active === 1) {
                tx.update(hackathon).set(tweaks).where(eq(hackathon.id, 1)).run();
            }
        }

        return tx.select().from(seasons).where(eq(seasons.id, seasonId)).get() ?? null;
    });
}

export async function setActiveSeason(event: H3Event, seasonId: number | null) {
    event.context.drizzle.transaction((tx: DbTransaction) => {
        let season: Season | undefined;
        if (seasonId !== null) {
            season = tx.select().from(seasons).where(eq(seasons.id, seasonId)).get();

            if (!season) {
                throw createError({
                    status: 404,
                    message: "Season not found",
                });
            }
        }

        tx.update(seasons).set({ is_active: 0 }).run();

        if (seasonId !== null && season) {
            tx.update(seasons).set({ is_active: 1 }).where(eq(seasons.id, seasonId)).run();

            // Copy the newly active season's tweaks into the live hackathon row
            const tweaks = pickTweaks(season as unknown as Record<string, unknown>);
            if (Object.keys(tweaks).length > 0) {
                tx.update(hackathon).set(tweaks).where(eq(hackathon.id, 1)).run();
            }
        }
    });
}

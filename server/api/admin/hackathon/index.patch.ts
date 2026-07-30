import { AdminUpdateHackathonRequest } from "~~/shared/schemas";
import { hackathon, seasons } from "~~/server/database/schema";
import { eq } from "drizzle-orm";
import { getActiveSeason, getSeasons } from "~~/server/utils/database/seasons";
import { applyRateLimit, DEFAULT_RATE_LIMIT_CONFIG } from "~~/server/utils/rateLimit";

// State fields are always saved to the global hackathon regardless of season_id.
// Session fields are saved per-season when season_id is provided.
const stateFieldKeys = new Set([
    "start_timestamp",
    "end_timestamp",
    "voting_start_timestamp",
    "voting_end_timestamp",
    "results_open_timestamp",
]);

const sessionFieldKeys = new Set([
    "status",
    "voting_enabled",
    "results_published",
    "judging_open",
    "max_votes_per_user",
    "schedule_start",
    "schedule_end",
    "theme_name",
    "theme_description",
]);

export default defineEventHandler(
    applyRateLimit(async (event) => {
        await requireAdmin(event);

        const body = await readValidatedBody(event, AdminUpdateHackathonRequest.parse);

        if (Object.keys(body).length === 0) {
            throw createError({
                statusCode: 400,
                message: "No fields to update",
            });
        }

        // Extract season_id from body — it's a routing hint, not a hackathon/season field
        const { season_id, ...rawConfig } = body as Record<string, any>;

        // Strip null/undefined values — they would violate NOT NULL constraints in both tables
        const stateFields: Record<string, any> = {};
        const sessionFields: Record<string, any> = {};
        for (const [k, v] of Object.entries(rawConfig)) {
            if (v === null || v === undefined) continue;
            if (stateFieldKeys.has(k)) stateFields[k] = v;
            else if (sessionFieldKeys.has(k)) sessionFields[k] = v;
        }

        if (Object.keys(stateFields).length === 0 && Object.keys(sessionFields).length === 0) {
            throw createError({
                statusCode: 400,
                message: "No fields to update",
            });
        }

        // State fields (timestamps) ALWAYS go to the global hackathon — never to a season.
        // This ensures timestamps are global values that don't change when switching seasons.
        if (Object.keys(stateFields).length > 0) {
            event.context.drizzle
                .update(hackathon)
                .set(stateFields)
                .where(eq(hackathon.id, 1))
                .run();
        }

        // Session fields go to the specified season if season_id is provided,
        // otherwise to the global hackathon.
        if (Object.keys(sessionFields).length > 0) {
            if (season_id !== undefined) {
                event.context.drizzle
                    .update(seasons)
                    .set(sessionFields)
                    .where(eq(seasons.id, season_id))
                    .run();

                // Also sync the active season's session fields to the global row
                const active = await getActiveSeason(event);
                if (active && active.id === season_id) {
                    event.context.drizzle
                        .update(hackathon)
                        .set(sessionFields)
                        .where(eq(hackathon.id, 1))
                        .run();
                }
            } else {
                event.context.drizzle
                    .update(hackathon)
                    .set(sessionFields)
                    .where(eq(hackathon.id, 1))
                    .run();
            }
        }

        const updated = await getHackathon(event);
        const allSeasons = await getSeasons(event);
        return { hackathon: updated, seasons: allSeasons };
    }, DEFAULT_RATE_LIMIT_CONFIG),
);

import { AdminUpdateHackathonRequest } from "~~/shared/schemas";
import { hackathon, seasons } from "~~/server/database/schema";
import { eq } from "drizzle-orm";
import { getActiveSeason, getSeasons } from "~~/server/utils/database/seasons";
import { applyRateLimit, DEFAULT_RATE_LIMIT_CONFIG } from "~~/server/utils/rateLimit";

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
        const { season_id, ...configFields } = body as Record<string, any>;

        if (Object.keys(configFields).length === 0) {
            throw createError({
                statusCode: 400,
                message: "No fields to update",
            });
        }

        if (season_id !== undefined) {
            // Per-season save: always write to the specified season.
            // ALSO write to the global hackathon row IF the season is the active one
            // (so the active season and global state stay in sync).
            event.context.drizzle
                .update(seasons)
                .set(configFields)
                .where(eq(seasons.id, season_id))
                .run();

            // If this is the active season, keep global state in sync
            const active = await getActiveSeason(event);
            if (active && active.id === season_id) {
                event.context.drizzle
                    .update(hackathon)
                    .set(configFields)
                    .where(eq(hackathon.id, 1))
                    .run();
            }
        } else {
            // Global-only save: update ONLY the global hackathon row
            event.context.drizzle
                .update(hackathon)
                .set(configFields)
                .where(eq(hackathon.id, 1))
                .run();
        }

        const updated = await getHackathon(event);
        const allSeasons = await getSeasons(event);
        return { hackathon: updated, seasons: allSeasons };
    }, DEFAULT_RATE_LIMIT_CONFIG),
);

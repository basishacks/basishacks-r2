import { AdminUpdateHackathonRequest } from "~~/shared/schemas";
import { hackathon, seasons } from "~~/server/database/schema";
import { eq } from "drizzle-orm";
import { getActiveSeason } from "~~/server/utils/database/seasons";
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

        // Extract season_id from body (not a hackathon field)
        const { season_id, ...configFields } = body as Record<string, any>;

        // Update the global hackathon row (runtime config)
        event.context.drizzle.update(hackathon).set(configFields).where(eq(hackathon.id, 1)).run();

        // Persist to the specified season, or fall back to the active season
        const targetSeasonId = season_id ?? (await getActiveSeason(event))?.id;
        if (targetSeasonId) {
            event.context.drizzle
                .update(seasons)
                .set(configFields)
                .where(eq(seasons.id, targetSeasonId))
                .run();
        }

        const updated = await getHackathon(event);
        return { hackathon: updated };
    }, DEFAULT_RATE_LIMIT_CONFIG),
);

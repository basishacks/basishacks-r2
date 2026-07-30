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

        // Update the global hackathon row (runtime config)
        event.context.drizzle
            .update(hackathon)
            .set(body as Record<string, any>)
            .where(eq(hackathon.id, 1))
            .run();

        // Also persist to the active season's per-season config
        const activeSeason = await getActiveSeason(event);
        if (activeSeason) {
            event.context.drizzle
                .update(seasons)
                .set(body as Record<string, any>)
                .where(eq(seasons.id, activeSeason.id))
                .run();
        }

        const updated = await getHackathon(event);
        return { hackathon: updated };
    }, DEFAULT_RATE_LIMIT_CONFIG),
);

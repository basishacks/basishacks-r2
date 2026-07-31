import { UpdateSeasonRequest } from "~~/shared/schemas";
import { seasons } from "~~/server/database/schema";
import { eq } from "drizzle-orm";
import { applyRateLimit, DEFAULT_RATE_LIMIT_CONFIG } from "~~/server/utils/rateLimit";

export default defineEventHandler(
    applyRateLimit(async (event) => {
        await requireAdmin(event);

        const body = await readValidatedBody(event, UpdateSeasonRequest.parse);

        const existing = event.context.drizzle
            .select()
            .from(seasons)
            .where(eq(seasons.id, body.id))
            .get();

        if (!existing) {
            throw createError({
                statusCode: 404,
                message: "Season not found",
            });
        }

        const { id, ...updateFields } = body;
        event.context.drizzle.update(seasons).set(updateFields).where(eq(seasons.id, id)).run();

        const allSeasons = await getSeasons(event);
        return { seasons: allSeasons };
    }, DEFAULT_RATE_LIMIT_CONFIG),
);

import { PositiveIntParam } from "~~/shared/schemas";
import { seasons } from "~~/server/database/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { applyRateLimit, DEFAULT_RATE_LIMIT_CONFIG } from "~~/server/utils/rateLimit";

const SeasonIdParams = z.object({ id: PositiveIntParam });

export default defineEventHandler(
    applyRateLimit(async (event) => {
        await requireAdmin(event);

        const { id } = await getValidatedRouterParams(event, SeasonIdParams.parse);

        const existing = event.context.drizzle
            .select()
            .from(seasons)
            .where(eq(seasons.id, id))
            .get();

        if (!existing) {
            throw createError({
                statusCode: 404,
                message: "Season not found",
            });
        }

        event.context.drizzle.delete(seasons).where(eq(seasons.id, id)).run();
        const allSeasons = await getSeasons(event);
        return { seasons: allSeasons };
    }, DEFAULT_RATE_LIMIT_CONFIG),
);

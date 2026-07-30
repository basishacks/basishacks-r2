import { AdminUpdateHackathonRequest } from "~~/shared/schemas";
import { hackathon } from "~~/server/database/schema";
import { eq } from "drizzle-orm";
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

        event.context.drizzle
            .update(hackathon)
            .set(body as Record<string, any>)
            .where(eq(hackathon.id, 1))
            .run();

        const updated = await getHackathon(event);
        return { hackathon: updated };
    }, DEFAULT_RATE_LIMIT_CONFIG),
);

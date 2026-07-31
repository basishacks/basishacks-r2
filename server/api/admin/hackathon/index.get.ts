import { applyRateLimit, DEFAULT_RATE_LIMIT_CONFIG } from "~~/server/utils/rateLimit";

export default defineEventHandler(
    applyRateLimit(async (event) => {
        await requireAdmin(event);

        const hackathonRow = await getHackathon(event);
        const allSeasons = await getSeasons(event);

        return { hackathon: hackathonRow, seasons: allSeasons };
    }, DEFAULT_RATE_LIMIT_CONFIG),
);

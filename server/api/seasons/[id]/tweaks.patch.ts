import { UpdateSeasonTweaksRequest } from "~~/shared/schemas";
import { DevPermissions } from "~~/shared/permissions";

const booleanFields = ["show_scores", "show_ranking"] as const;

export default defineEventHandler(
    applyRateLimit(async (event) => {
        await requirePermission(event, DevPermissions.PORTAL_SEASONS_EDIT);

        const id = parseInt(getRouterParam(event, "id")!);
        const body = await readValidatedBody(event, UpdateSeasonTweaksRequest.parse);

        const data: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(body)) {
            if (value === undefined) continue;
            data[key] = booleanFields.includes(key as (typeof booleanFields)[number])
                ? value
                    ? 1
                    : 0
                : value;
        }

        // Updates the season row; when the season is the live (active) season,
        // the hackathon singleton is updated as well.
        const updated = await updateSeasonTweaks(event, id, data);
        if (!updated) {
            throw createError({
                statusCode: 404,
                message: "Season not found",
            });
        }

        return { message: "Season tweaks updated" };
    }),
);

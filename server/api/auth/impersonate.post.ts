import z from "zod";
import { requireAdmin } from "~~/server/utils/auth";
import { applyRateLimit, AUTH_RATE_LIMIT_CONFIG } from "~~/server/utils/rateLimit";

const ImpersonateRequest = z.object({
    userId: z.number().int().positive().finite(),
});

export default defineEventHandler(
    applyRateLimit(async (event) => {
        await requireAdmin(event);

        const body = await readValidatedBody(event, ImpersonateRequest.parse);

        const targetUser = await getUser(event, body.userId);
        if (!targetUser) {
            throw createError({
                status: 404,
                message: "Target user not found",
            });
        }

        await setUserSession(event, {
            user: {
                id: targetUser.id,
            },
        });

        return { success: true };
    }, AUTH_RATE_LIMIT_CONFIG),
);

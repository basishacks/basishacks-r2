import z from "zod";
import { requireAdmin } from "~~/server/utils/auth";
import { getUser } from "~~/server/utils/database/users";
import { applyRateLimit, AUTH_RATE_LIMIT_CONFIG } from "~~/server/utils/rateLimit";

const ImpersonateRequest = z.object({
    userId: z.number().int().positive().finite(),
});

export default defineEventHandler(
    applyRateLimit(async (event) => {
        const admin = await requireAdmin(event);

        const body = await readValidatedBody(event, ImpersonateRequest.parse);

        const targetUser = await getUser(event, body.userId);
        if (!targetUser) {
            throw createError({
                status: 403,
                message: "Cannot impersonate this user",
            });
        }

        console.log(
            `[AUDIT] Admin ${admin.id} (${admin.email}) impersonated user ${targetUser.id} (${targetUser.email})`,
        );

        await setUserSession(event, {
            user: {
                id: targetUser.id,
            },
        });

        return { success: true };
    }, AUTH_RATE_LIMIT_CONFIG),
);

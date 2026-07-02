import z from "zod";
import { requireAdmin } from "~~/server/utils/auth";

const ImpersonateRequest = z.object({
    userId: z.number().int().positive(),
});

export default defineEventHandler(async (event) => {
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
});

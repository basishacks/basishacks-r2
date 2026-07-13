import { createSession } from "~~/server/utils/deepseek-store";
import { requirePermission } from "~~/server/utils/auth";
import { DevPermissions } from "~~/shared/permissions";
import z from "zod";
import { applyRateLimit, DEFAULT_RATE_LIMIT_CONFIG } from "~~/server/utils/rateLimit";

const CreateDeepSeekSessionRequest = z.object({
    sessionName: z.string().min(1).max(100, "Session name is too long"),
});

export default defineEventHandler(
    applyRateLimit(async (event) => {
        await requirePermission(event, DevPermissions.DEEPSEEK);

        const { sessionName } = await readValidatedBody(event, CreateDeepSeekSessionRequest.parse);

        try {
            const session = createSession(sessionName);
            return session;
        } catch (error: any) {
            console.error("Error creating deepseek session:", error);
            throw createError({
                statusCode: 500,
                statusMessage: "Failed to create session",
            });
        }
    }, DEFAULT_RATE_LIMIT_CONFIG),
);

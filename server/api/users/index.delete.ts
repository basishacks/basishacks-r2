import { z } from "zod";
import { NethackPermissions } from "~~/shared/permissions";

const DeleteUsersRequest = z.object({
    ids: z.array(z.number().int().positive()),
});

export default defineEventHandler(
    applyRateLimit(async (event) => {
        await requireUser(event, NethackPermissions.Users.delete);

        const body = await readValidatedBody(event, DeleteUsersRequest.parse);
        await deleteUsers(event, body.ids);

        return { message: `Deleted ${body.ids.length} user(s)` };
    }),
);

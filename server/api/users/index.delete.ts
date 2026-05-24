import { z } from 'zod';
import { DevPermissions } from '~~/shared/permissions';

const DeleteUsersRequest = z.object({
  ids: z.array(z.number().int().positive()),
});

export default defineEventHandler(
  applyRateLimit(async (event) => {
    await requirePermission(event, DevPermissions.USERS);

    const body = await readValidatedBody(event, DeleteUsersRequest.parse);
    await deleteUsers(event, body.ids);

    return { message: `Deleted ${body.ids.length} user(s)` };
  }),
);

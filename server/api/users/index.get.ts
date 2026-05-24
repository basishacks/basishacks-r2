import { DevPermissions } from '~~/shared/permissions';

export default defineEventHandler(async (event) => {
  await requirePermission(event, DevPermissions.PORTAL_USERS_VIEW);

  const results = (await event.context.db.prepare('SELECT * FROM users ORDER BY id ASC').all()) as {
    results: User[];
  };

  return results.results;
});

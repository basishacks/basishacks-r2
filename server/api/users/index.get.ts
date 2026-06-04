import { DevPermissions } from "~~/shared/permissions";

export default defineEventHandler(async (event) => {
    await requirePermission(event, DevPermissions.PORTAL_USERS_VIEW);

    const results = (await event.context.db
        .prepare(
            `SELECT u.*, GROUP_CONCAT(upt.team_id) as past_team_ids
     FROM users u
     LEFT JOIN user_past_teams upt ON u.id = upt.user_id
     GROUP BY u.id
     ORDER BY u.id ASC`,
        )
        .all()) as { results: (User & { past_team_ids: string | null })[] };

    return results.results;
});

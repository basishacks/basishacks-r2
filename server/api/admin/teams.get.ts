import { DevPermissions } from "~~/shared/permissions";

export default defineEventHandler(async (event) => {
    await requirePermission(event, DevPermissions.TEAMS);

    const results = (await event.context.db
        .prepare(
            `SELECT t.*, s.name as season_name
     FROM teams t
     LEFT JOIN seasons s ON t.season_id = s.id
     ORDER BY t.id ASC`,
        )
        .all()) as { results: (Team & { season_name: string | null })[] };

    return results.results;
});

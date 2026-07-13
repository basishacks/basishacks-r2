import { DevPermissions } from "~~/shared/permissions";
import { teams, seasons } from "~~/server/database/schema";
import { eq, sql } from "drizzle-orm";
import { applyRateLimit, DEFAULT_RATE_LIMIT_CONFIG } from "~~/server/utils/rateLimit";

export default defineEventHandler(
    applyRateLimit(async (event) => {
        await requirePermission(event, DevPermissions.TEAMS);

        const results = event.context.drizzle
            .select({
                id: teams.id,
                name: teams.name,
                pathway: teams.pathway,
                score: teams.score,
                rank: teams.rank,
                project_name: teams.project_name,
                project_description: teams.project_description,
                project_demo_url: teams.project_demo_url,
                project_repo_url: teams.project_repo_url,
                project_submitted: teams.project_submitted,
                sourcing: teams.sourcing,
                season_id: teams.season_id,
                season_name: sql<string | null>`${seasons.name}`.as("season_name"),
            })
            .from(teams)
            .leftJoin(seasons, eq(teams.season_id, seasons.id))
            .orderBy(teams.id)
            .all();

        return results;
    }, DEFAULT_RATE_LIMIT_CONFIG),
);

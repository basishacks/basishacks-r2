import { DevPermissions, hasPermission } from "~~/shared/permissions";
import { TeamIdParams } from "~~/shared/schemas";

export default defineEventHandler(async (event) => {
    const user = await requireUser(event);
    const { id } = await getValidatedRouterParams(event, TeamIdParams.parse);
    const isMember = user.team_id === id;

    const team = await getTeam(event, id, true);

    if (!team) {
        throw createError({
            status: 404,
            message: "Team '" + id + "' does not exist",
        });
    }

    // Dev-portal users always see scores and ranks; team members and other
    // participants only see them when the team's own season toggles are enabled.
    const resolveVisibility = await getScoreRankVisibilityResolver(event);
    const visibility = resolveVisibility(team.season_id);
    const privileged =
        hasPermission(user.role, DevPermissions.PORTAL_TEAMS_VIEW) ||
        hasPermission(user.role, "admin");
    const withScore = privileged || (isMember && visibility.showScores);
    const withRank = privileged || visibility.showRanking;
    const awards = await getAwards(event, id);

    return convertTeamToPublic(team, { withScore, withRank }, awards);
});

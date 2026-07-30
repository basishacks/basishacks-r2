import { DevPermissions, hasPermission } from "~~/shared/permissions";

export default defineEventHandler(async (event) => {
    const user = await requireUser(event);
    const id = parseInt(getRouterParam(event, "id")!);
    const isMember = user.team_id === id;

    const team = await getTeam(event, id, true);

    if (!team) {
        throw createError({
            status: 404,
            message: "Team '" + id + "' does not exist",
        });
    }

    // Dev-portal users always see scores and ranks; team members and other
    // participants only see them when the hackathon toggles are enabled.
    const hackathon = await getHackathon(event);
    const privileged =
        hasPermission(user.role, DevPermissions.PORTAL_TEAMS_VIEW) ||
        hasPermission(user.role, "admin");
    const withScore = privileged || (isMember && !!hackathon?.show_scores);
    const withRank = privileged || !!hackathon?.show_ranking;
    const awards = await getAwards(event, id);

    return convertTeamToPublic(team, { withScore, withRank }, awards);
});

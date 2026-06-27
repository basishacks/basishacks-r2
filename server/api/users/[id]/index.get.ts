import { getUserPastTeams } from "~~/server/utils/database/members";
import { getTeamById } from "~~/server/utils/database/teams";

export default defineEventHandler(async (event) => {
    const currentUser = await getUserSession(event);

    const id = parseInt(getRouterParam(event, "id")!);
    const isSelf = currentUser.user?.id === id;

    const user = await getUser(event, id);
    if (!user) {
        throw createError({
            status: 404,
            message: "User not found",
        });
    }

    if (!isSelf) {
        // Public view: return only APIUser without team or past teams
        return convertUserToPublic(user) satisfies APIUser;
    }

    // Self view: return full GetUserResponse
    const team = user.team_id ? await getTeamById(event, user.team_id) : null;
    const pastTeams = await getUserPastTeams(event, id);

    const allTeamIds = [...(team ? [team.id] : []), ...pastTeams.map((t) => t.id)];
    const awardsByTeam = await getAwardsForTeams(event, allTeamIds);

    return {
        ...convertUserToPublic(user),
        team: team && convertTeamToPublic(team, true, awardsByTeam[team.id] ?? []),
        past_teams: pastTeams.map((t) => convertTeamToPublic(t, true, awardsByTeam[t.id] ?? [])),
    } satisfies GetUserResponse;
});

import { GetTeamsQuery } from "~~/shared/schemas";

export default defineEventHandler(async (event) => {
    const query = await getValidatedQuery(event, GetTeamsQuery.parse);

    if (query.judging) {
        const { id: userID } = await requireJudge(event);

        const hackathon = await getHackathon(event);
        if (!hackathon || !hackathon.judging_open) {
            throw createError({
                statusCode: 403,
                message: "Judging is not open",
            });
        }

        const teams = await getSubmittedUnjudgedTeams(event, userID);
        const awardsByTeam = await getAwardsForTeams(
            event,
            teams.map((t) => t.id),
        );

        return teams.map((t) =>
            convertTeamToPublic(t, { withScore: false }, awardsByTeam[t.id] ?? []),
        );
    } else {
        const seasonId = query.season_id ?? -1;
        const teams =
            seasonId === -1 ? await getAllTeams(event) : await getTeamsBySeason(event, seasonId);
        const awardsByTeam = await getAwardsForTeams(
            event,
            teams.map((t) => t.id),
        );

        // Public listing: ranks are only exposed when the team's own season
        // has the ranking toggle enabled
        const resolveVisibility = await getScoreRankVisibilityResolver(event);

        return teams.map((t) =>
            convertTeamToPublic(
                t,
                { withRank: resolveVisibility(t.season_id).showRanking },
                awardsByTeam[t.id] ?? [],
            ),
        );
    }
});

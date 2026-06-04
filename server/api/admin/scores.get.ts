import rubrics from "~~/shared/rubric";

export default defineEventHandler(async (event) => {
    await requireAdmin(event);

    const query = getQuery(event);
    const shouldUpdate = !!query.update;

    const teams = (await getAllTeams(event)).filter((t) => t.project_submitted);

    // Fetch all scores in a single query and group by team_id
    const allScores = await getAllTeamScores(event);
    const scoresByTeamId = new Map<number, TeamScores[]>();
    for (const score of allScores) {
        const existing = scoresByTeamId.get(score.team_id);
        if (existing) {
            existing.push(score);
        } else {
            scoresByTeamId.set(score.team_id, [score]);
        }
    }

    const pathways = ["junior", "senior"] as const;
    for (const pathway of pathways) {
        const projects = teams.filter((t) => t.pathway === pathway);

        // calculate scores
        for (const project of projects) {
            const judgeScores = scoresByTeamId.get(project.id) ?? [];
            let judgeTotal = 0;
            for (const score of judgeScores) {
                const scores = JSON.parse(score.scores);
                for (const [category, { weight }] of Object.entries(rubrics[pathway])) {
                    judgeTotal += (scores[category] * weight) / 5;
                }
            }
            const totalScore =
                judgeScores.length > 0 ? Math.round((judgeTotal / judgeScores.length) * 100) : 0;
            project.score = totalScore;
        }

        projects.sort((a, b) => b.score! - a.score!);

        // calculate ranks
        let rank = 0,
            rankIncrement = 1,
            lastScore = 1e9;

        for (const project of projects) {
            if (project.score! < lastScore) {
                rank += rankIncrement;
                rankIncrement = 0;
                lastScore = project.score!;
            }
            rankIncrement++;
            project.rank = rank;
        }
    }

    if (shouldUpdate) {
        console.log("update!");
        await Promise.all(teams.map((t) => updateTeam(event, t)));
    }

    const awardsByTeam = await getAwardsForTeams(
        event,
        teams.map((t) => t.id),
    );

    return teams
        .toSorted((a, b) => a.pathway!.localeCompare(b.pathway!) || a.rank! - b.rank!)
        .map((t) => convertTeamToPublic(t, true, awardsByTeam[t.id] ?? []));
});

import rubrics from "~~/shared/rubric";
import { applyRateLimit, DEFAULT_RATE_LIMIT_CONFIG } from "~~/server/utils/rateLimit";
import z from "zod";

const UpdateQuerySchema = z.object({
    update: z
        .enum(["true", "false"])
        .optional()
        .transform((s) => s === "true"),
});

export default defineEventHandler(
    applyRateLimit(async (event) => {
        await requireAdmin(event);

        const query = await getValidatedQuery(event, UpdateQuerySchema.parse);
        const shouldUpdate = query.update ?? false;

        const teams = (await getAllTeams(event)).filter((t) => t.project_submitted);

        const pathways = ["junior", "senior"] as const;
        for (const pathway of pathways) {
            const projects = teams.filter((t) => t.pathway === pathway);

            // calculate scores
            for (const project of projects) {
                const judgeScores = await getTeamScoresByTeamID(event, project.id);
                let judgeTotal = 0;
                for (const score of judgeScores) {
                    const scores = JSON.parse(score.scores);
                    for (const [category, { weight }] of Object.entries(rubrics[pathway])) {
                        judgeTotal += (scores[category] * weight) / 5;
                    }
                }
                const totalScore =
                    judgeScores.length > 0
                        ? Math.round((judgeTotal / judgeScores.length) * 100)
                        : 0;
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
            .map((t) =>
                convertTeamToPublic(
                    t,
                    { withScore: true, withRank: true },
                    awardsByTeam[t.id] ?? [],
                ),
            );
    }, DEFAULT_RATE_LIMIT_CONFIG),
);

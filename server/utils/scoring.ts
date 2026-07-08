import rubrics, { RubricBallot } from "~~/shared/rubric";
import { getTeamScoresBySeasonId } from "./database/scores";
import type { H3Event } from "h3";

export async function computeScores(event: H3Event, seasonID: number) {
    const scores = await getTeamScoresBySeasonId(event, seasonID);

    const score_avg: Record<number, number> = {};
    const participated: Team[] = [];

    for (const score of scores) {
        const team: Team | null = await getTeam(event, score.team_id);
        const judge: User | null = await getUser(event, score.judge_user_id);

        if (!team) {
            console.error(
                "[Score] Failed score compute: Team " + score.team_id + " does not exist",
            );
            return;
        }

        const rubric: RubricBallot | undefined = rubrics[team.pathway!];
        if (!rubric) return;

        const standing: {
            originality: number;
            presentation: number;
            technicality: number;
            theme: number;
            impact: number;
        } = JSON.parse(score.scores);

        const sum: number =
            standing.originality * rubric.originality.weight +
            standing.presentation * rubric.presentation.weight +
            standing.technicality * rubric.technicality.weight +
            standing.theme * rubric.theme.weight +
            standing.impact * rubric.impact.weight;

        if (!score_avg[team.id]) {
            score_avg[team.id] = sum;
            participated.push(team);
        } else score_avg[team.id] = (score_avg[team.id]! + sum) / 2;
    }

    const teams_junior: Team[] = [];
    const teams_senior: Team[] = [];

    for (const team of participated) {
        const rounded = Math.round(score_avg[team.id]! * 1.6); // scale by 800
        team.score = rounded;

        if (team.pathway == "junior") {
            teams_junior.push(team);
        } else {
            teams_senior.push(team);
        }
    }

    teams_junior.sort((a, b) => {
        return b.score! - a.score!;
    });
    teams_senior.sort((a, b) => {
        return b.score! - a.score!;
    });

    for (let i = 1; i <= teams_junior.length; i++) {
        teams_junior[i - 1]!.rank = i;
        await updateTeam(event, teams_junior[i - 1]!);
    }

    for (let i = 1; i <= teams_senior.length; i++) {
        teams_senior[i - 1]!.rank = i;
        await updateTeam(event, teams_senior[i - 1]!);
    }
}

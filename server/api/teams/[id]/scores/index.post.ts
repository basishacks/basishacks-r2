import { CreateTeamScoresRequest, TeamIdParams } from "~~/shared/schemas";
import { getTeam } from "~~/server/utils/database/teams";
import { applyRateLimit, VOTE_RATE_LIMIT_CONFIG } from "~~/server/utils/rateLimit";

export default defineEventHandler(
    applyRateLimit(async (event) => {
        const { id: teamID } = await getValidatedRouterParams(event, TeamIdParams.parse);

        const { id: userID } = await requireJudge(event);

        const hackathon = await getHackathon(event);
        if (hackathon?.status !== "voting") {
            throw createError({
                status: 409,
                message: "Scoring is not open",
            });
        }

        const team = await getTeam(event, teamID);
        if (!team) {
            throw createError({
                status: 404,
                message: "Team not found",
            });
        }
        if (!team.project_submitted) {
            throw createError({
                status: 400,
                message: "Team has not submitted a project",
            });
        }

        const payload = await readValidatedBody(event, CreateTeamScoresRequest.parse);

        try {
            await createTeamScores(event, {
                team_id: teamID,
                judge_user_id: userID,
                scores: JSON.stringify(payload.scores),
                reasoning: payload.reasoning,
            });
        } catch {
            throw createError({
                status: 409,
                message: "You already scored this project",
            });
        }

        return { message: "Successfully scored project" };
    }, VOTE_RATE_LIMIT_CONFIG),
);

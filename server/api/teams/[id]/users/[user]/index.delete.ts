import { TeamUserParams } from "~~/shared/schemas";
import { applyRateLimit, DEFAULT_RATE_LIMIT_CONFIG } from "~~/server/utils/rateLimit";

export default defineEventHandler(
    applyRateLimit(async (event) => {
        const { id: teamID, user: userID } = await getValidatedRouterParams(
            event,
            TeamUserParams.parse,
        );

        const {
            user: { id: currentUserID },
        } = await requireUserSession(event);

        const currentUser = await getUser(event, currentUserID);
        if (currentUser?.team_id !== teamID) {
            throw createError({
                status: 403,
                message: "Cannot remove members of other teams",
            });
        }

        const hackathon = await getHackathon(event);
        if (hackathon?.status !== "not_started" && hackathon?.status !== "in_progress") {
            throw createError({
                status: 403,
                message: "Cannot remove members after hackathon has finished",
            });
        }

        const team = (await getTeam(event, teamID))!;
        if (team.project_submitted) {
            throw createError({
                status: 403,
                message: "Cannot remove members after project is submitted",
            });
        }

        await removeTeamMember(event, teamID, userID);

        return { message: "Removed user from the team" };
    }, DEFAULT_RATE_LIMIT_CONFIG),
);

import { NethackPermissions } from "~~/shared/permissions";
import { computeScores } from "~~/server/utils/scoring";

export default defineEventHandler(async (event) => {
    await requireUser(event, NethackPermissions.Judging.resultsCompute);
    await computeScores(event, 1);

    return {
        message: "Computed scores for all users successfully.",
    };
});

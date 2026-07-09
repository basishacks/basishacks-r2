import { computeScores } from "~~/server/utils/scoring";

export default defineEventHandler(async (event) => {
    await computeScores(event, 1);

    return {
        message: "Computed scores for all users successfully.",
    };
});

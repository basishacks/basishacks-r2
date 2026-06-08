import { VotePermissions } from "~~/shared/permissions";

export default defineEventHandler(async (event): Promise<ElectionPosition[]> => {
    await requirePermission(event, VotePermissions.VOTE);
    return electionPositions;
});

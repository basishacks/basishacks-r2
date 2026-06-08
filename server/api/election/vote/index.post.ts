import { VotePermissions } from "~~/shared/permissions";
import { ElectionVoteRequest } from "~~/shared/schemas";

export default defineEventHandler(async (event) => {
    await requirePermission(event, VotePermissions.VOTE);
    const body = await readValidatedBody(event, ElectionVoteRequest.parse);
    const errors: string[] = [];

    for (const position of body.positions) {
        const ranks = position.candidates.map((c) => c.rank).filter((r): r is number => r !== null);

        // Check for duplicates
        const seen = new Set<number>();
        for (const rank of ranks) {
            if (seen.has(rank)) {
                errors.push(`Duplicate ranks in ${position.title}`);
                break;
            }
            seen.add(rank);
        }

        // Check for skipped ranks (must be exactly 1..k)
        const sorted = [...seen].sort((a, b) => a - b);
        for (let i = 0; i < sorted.length; i++) {
            if (sorted[i] !== i + 1) {
                errors.push(`Skipped ranks in ${position.title}`);
                break;
            }
        }
    }

    if (errors.length > 0) {
        throw createError({
            statusCode: 400,
            statusMessage: errors.join(", "),
        });
    }

    const { user } = await requireUserSession(event);

    const voteMap: Record<string, number | null> = {};
    for (const position of body.positions) {
        for (const candidate of position.candidates) {
            voteMap[candidate.id] = candidate.rank;
        }
    }

    event.context.db
        .prepare("INSERT INTO sc_votes(user_id, vote, submitted_at) VALUES(?, ?, ?)")
        .bind(user.id, JSON.stringify(voteMap), Date.now())
        .run();

    return { message: "Vote submitted successfully" };
});

import { VotePermissions } from "~~/shared/permissions"
import { scVotes } from '~~/server/database/schema'
import { getHackathon } from '~~/server/utils/database/hackathon'

function runIRV(
    candidates: ElectionCandidate[],
    ballots: string[][],
): {
    status: "elected" | "tie" | "no_votes";
    winner?: string;
    details?: string;
} {
    const names: Record<string, string> = {};
    for (const c of candidates) names[c.id] = c.shortName;

    let active = new Set(candidates.map((c) => c.id));

    while (true) {
        const counts: Record<string, number> = {};
        for (const id of active) counts[id] = 0;

        let validBallots = 0;
        for (const ballot of ballots) {
            let vote: string | null = null;
            for (const pref of ballot) {
                if (active.has(pref)) {
                    vote = pref;
                    break;
                }
            }
            if (vote !== null) {
                counts[vote] = (counts[vote] ?? 0) + 1
                validBallots++;
            }
        }

        if (validBallots === 0) {
            return { status: "no_votes" };
        }

        // Check majority
        for (const id of active) {
            if (counts[id]! > validBallots / 2) {
                return { status: "elected", winner: names[id] };
            }
        }

        if (active.size === 1) {
            const id = [...active][0]!;
            return { status: "elected", winner: names[id] };
        }

        if (active.size === 2) {
            const ids: string[] = [...active];
            if (counts[ids[0]!]! === counts[ids[1]!]!) {
                return {
                    status: "tie",
                    details: `Tie between ${names[ids[0]!]} and ${names[ids[1]!]}`,
                };
            }
            // Eliminate the one with fewer votes
            const loser = counts[ids[0]!]! < counts[ids[1]!]! ? ids[0]! : ids[1]!;
            active.delete(loser);
            continue;
        }

        let minCount = Infinity;
        for (const id of active) {
            if (counts[id]! < minCount) minCount = counts[id]!;
        }

        const losers: string[] = [...active].filter((id) => counts[id] === minCount);

        if (losers.length > 1) {
            return {
                status: "tie",
                details: `Tie for elimination between ${losers.map((id) => names[id]!).join(", ")}`,
            };
        }

        active.delete(losers[0]!);
    }
}

export default defineEventHandler(async (event): Promise<ElectionResult> => {
    await requirePermission(event, VotePermissions.VOTE);

    const rows = event.context.drizzle
        .select({ vote: scVotes.vote })
        .from(scVotes)
        .all()

    const totalBallots = rows.length;

    // Only return full IRV results after the election close (results_open_timestamp)
    const hackathon = await getHackathon(event)
    const now = Date.now()
    const resultsOpen = hackathon && hackathon.results_open_timestamp > 0 && now >= hackathon.results_open_timestamp

    if (!resultsOpen) {
        // Return only totalBallots with empty positions before results are open
        return {
            totalBallots,
            positions: electionPositions.map((position) => ({
                title: position.title,
                status: "no_votes" as const,
            })),
        }
    }

    const positionResults = electionPositions.map((position) => {
        const ballots: string[][] = [];

        for (const row of rows) {
            const vote = JSON.parse(row.vote!) as Record<string, number | null>;
            const prefs: { id: string; rank: number }[] = [];

            for (const candidate of position.candidates) {
                const rank = vote[candidate.id];
                if (rank != null) {
                    prefs.push({ id: candidate.id, rank });
                }
            }

            if (prefs.length > 0) {
                prefs.sort((a, b) => a.rank - b.rank);
                ballots.push(prefs.map((p) => p.id));
            }
        }

        const result = runIRV(position.candidates, ballots);
        return {
            title: position.title,
            ...result,
        };
    });

    return {
        totalBallots,
        positions: positionResults,
    };
});
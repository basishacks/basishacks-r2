import { VotePermissions } from "~~/shared/permissions"
import { ElectionVoteRequest } from "~~/shared/schemas"
import { scVotes } from '~~/server/database/schema'
import { electionPositions } from '~~/server/utils/election'

export default defineEventHandler(async (event) => {
    const user = await requirePermission(event, VotePermissions.VOTE)
    const body = await readValidatedBody(event, ElectionVoteRequest.parse)
    const errors: string[] = []

    // Validate positions count matches the election definition
    if (body.positions.length !== electionPositions.length) {
        errors.push(`Expected ${electionPositions.length} positions, got ${body.positions.length}`)
    }

    for (const position of body.positions) {
        // Validate position title against known election positions
        const knownPosition = electionPositions.find((p) => p.title === position.title)
        if (!knownPosition) {
            errors.push(`Unknown position title: ${position.title}`)
            continue
        }

        // Validate candidate IDs belong to this position
        const validCandidateIds = new Set(knownPosition.candidates.map((c) => c.id))
        for (const candidate of position.candidates) {
            if (!validCandidateIds.has(candidate.id)) {
                errors.push(`Unknown candidate ${candidate.id} for position ${position.title}`)
            }
        }

        const ranks = position.candidates.map((c) => c.rank).filter((r): r is number => r !== null)

        // Check for duplicates
        const seen = new Set<number>()
        for (const rank of ranks) {
            if (seen.has(rank)) {
                errors.push(`Duplicate ranks in ${position.title}`)
                break
            }
            seen.add(rank)
        }

        // Check for skipped ranks (must be exactly 1..k)
        const sorted = [...seen].sort((a, b) => a - b)
        for (let i = 0; i < sorted.length; i++) {
            if (sorted[i] !== i + 1) {
                errors.push(`Skipped ranks in ${position.title}`)
                break
            }
        }
    }

    if (errors.length > 0) {
        throw createError({
            statusCode: 400,
            statusMessage: errors.join(", "),
        })
    }

    const voteMap: Record<string, number | null> = {}
    for (const position of body.positions) {
        for (const candidate of position.candidates) {
            voteMap[candidate.id] = candidate.rank
        }
    }

    event.context.drizzle
        .insert(scVotes)
        .values({
            user_id: user.id,
            vote: JSON.stringify(voteMap),
            submitted_at: Date.now(),
        })
        .onConflictDoUpdate({
            target: scVotes.user_id,
            set: {
                vote: JSON.stringify(voteMap),
                submitted_at: Date.now(),
            },
        })
        .run()

    return { message: "Vote submitted successfully" }
})

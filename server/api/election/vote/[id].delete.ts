import { scVotes } from '~~/server/database/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
    await requireAdmin(event)

    const id = getRouterParam(event, "id")
    if (!id) {
        throw createError({
            statusCode: 400,
            statusMessage: "Missing ballot ID",
        })
    }

    const ballotId = Number(id)
    if (Number.isNaN(ballotId)) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid ballot ID",
        })
    }

    const result = event.context.drizzle
        .delete(scVotes)
        .where(eq(scVotes.id, ballotId))
        .run()

    return {
        message: "Ballot deleted",
        changes: result.changes,
    }
})

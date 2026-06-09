export default defineEventHandler(async (event) => {
    await requireAdmin(event);

    const id = getRouterParam(event, "id");
    if (!id) {
        throw createError({
            statusCode: 400,
            statusMessage: "Missing ballot ID",
        });
    }

    const ballotId = Number(id);
    if (Number.isNaN(ballotId)) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid ballot ID",
        });
    }

    const result = event.context.db
        .prepare("DELETE FROM sc_votes WHERE id = ?")
        .bind(ballotId)
        .run();

    return {
        message: "Ballot deleted",
        changes: result.meta.changed_db,
    };
});

export default defineEventHandler(async (event) => {
    await requireAdmin(event);

    const id = getRouterParam(event, "id");
    if (!id) {
        throw createError({
            statusCode: 400,
            statusMessage: "Missing user ID",
        });
    }

    const userId = Number(id);
    if (Number.isNaN(userId)) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid user ID",
        });
    }

    const result = event.context.db
        .prepare("DELETE FROM sc_votes WHERE user_id = ?")
        .bind(userId)
        .run();

    return {
        message: "Ballot deleted",
        changes: result.meta.changed_db,
    };
});

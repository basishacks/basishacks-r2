export default defineEventHandler(async (event) => {
    const id = parseInt(getRouterParam(event, "id")!);
    const season = await getSeasonById(event, id);

    if (!season) {
        throw createError({
            statusCode: 404,
            message: "Season not found",
        });
    }

    return season;
});

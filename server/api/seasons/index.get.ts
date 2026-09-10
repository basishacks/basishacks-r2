export default defineEventHandler(async (event) => {
    return await getSeasons(event);
});

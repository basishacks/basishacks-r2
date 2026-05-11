export default defineEventHandler(async (event) => {
    await sendRedirect(event, "/dashboard", 301)
})
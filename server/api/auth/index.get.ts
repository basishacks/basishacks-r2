export default defineEventHandler(async (event) => {
    console.log("[Authorize -> OAuth2] Dummy code: " + getQuery(event).code)
    await sendRedirect(event, "/dashboard", 301)
})
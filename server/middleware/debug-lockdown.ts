/**
 * Debug route lockdown middleware.
 *
 * When the environment variable DISABLE_DEBUG_ROUTES is set to a truthy value,
 * every request under /api/debug/* and /debug* is rejected before reaching the
 * route handler. This prevents development utilities from being reachable in
 * production even if a page or route guard is accidentally weakened.
 */
export default defineEventHandler(async (event) => {
    const url = event.node.req.url || "";
    const isDebugRoute =
        url.startsWith("/api/debug/") || url === "/debug" || url.startsWith("/debug/");
    if (!isDebugRoute) return;

    if (process.env.DISABLE_DEBUG_ROUTES) {
        throw createError({
            status: 404,
            statusMessage: "Not Found",
            message: "Debug routes are disabled",
        });
    }
});

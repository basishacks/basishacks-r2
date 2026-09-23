export default defineNuxtRouteMiddleware(async (to) => {
    const { ready, loggedIn, refresh } = useBasisAuthSession();
    if (!ready.value || !loggedIn.value) await refresh();

    if (!loggedIn.value) {
        // Preserve the requested URL so login can redirect back after authentication
        return navigateTo(`/api/login?redirect=${encodeURIComponent(to.fullPath)}`, {
            external: true,
        });
    }
});

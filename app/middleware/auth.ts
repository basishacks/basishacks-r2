export default defineNuxtRouteMiddleware((to) => {
    const { loggedIn } = useUserSession();

    if (!loggedIn.value) {
        // Preserve the requested URL so login can redirect back after authentication
        return navigateTo(`/api/login?redirect=${encodeURIComponent(to.fullPath)}`, {
            external: true,
        });
    }
});

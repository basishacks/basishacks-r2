export default defineNuxtRouteMiddleware(async (to) => {
    const { loggedIn, fetch } = useUserSession();

    if (!loggedIn.value) {
        // The client can reach this middleware before nuxt-auth-utils has
        // hydrated its session state after an external OIDC redirect. Confirm
        // the server-side session before treating the user as anonymous.
        await fetch();
    }

    if (!loggedIn.value) {
        // Preserve the requested URL so login can redirect back after authentication
        return navigateTo(`/api/login?redirect=${encodeURIComponent(to.fullPath)}`, {
            external: true,
        });
    }
});

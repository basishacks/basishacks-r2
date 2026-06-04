export default defineNuxtRouteMiddleware(() => {
    const { loggedIn } = useUserSession();

    if (!loggedIn.value) {
        // Force redirect
        return navigateTo("/api/login", { external: true });
    }
});

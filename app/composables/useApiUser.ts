export function useApiUser(options?: { lazy?: boolean }) {
    const { user: sessionUser, clear: clearSession } = useUserSession();
    const userID = computed(() => sessionUser.value?.id);

    if (!userID.value) {
        return;
    }

    const fetchResult = useFetch<GetUserResponse>(() => `/api/users/${userID.value}`, {
        lazy: options?.lazy ?? false,
    });

    return {
        ...fetchResult,
        user: fetchResult.data,
        sessionUser,
        clear: clearSession,
    };
}

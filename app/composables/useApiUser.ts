export function useAPIUser(options?: { lazy?: boolean }) {
    const { user: sessionUser, clear: clearSession } = useUserSession();
    const userID = computed(() => sessionUser.value?.id);

    const fetchResult = useFetch<GetUserResponse>(
        () => (userID.value ? `/api/users/${userID.value}` : null),
        { lazy: options?.lazy ?? false },
    );

    return {
        ...fetchResult,
        user: fetchResult.data,
        sessionUser,
        clear: clearSession,
    };
}

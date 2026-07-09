export function useApiUser(options?: { lazy?: boolean }) {
    const { user: sessionUser, clear: clearSession } = useUserSession();
    const userID = computed(() => sessionUser.value?.id);

    const fetchResult = useFetch<GetUserResponse>(() => `/api/users/${userID.value}`, {
        lazy: options?.lazy ?? false,
        immediate: !!userID.value,
        watch: [userID],
    });

    return {
        ...fetchResult,
        user: fetchResult.data,
        sessionUser,
        clear: clearSession,
    };
}

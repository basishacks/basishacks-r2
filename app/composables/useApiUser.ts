export async function useApiUser() {
    const { user: sessionUser, clear } = useUserSession();
    const userID = computed(() => sessionUser.value?.id ?? 0);

    const { data, refresh } = await useFetch<GetUserResponse>(() =>
        userID.value ? `/api/users/${userID.value}` : ``,
    );

    return {
        user: data as Ref<APIUser | null | undefined>,
        refresh,
        clear,
    };
}

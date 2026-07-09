import type { AsyncData } from "nuxt/app";
import type { FetchError } from "ofetch";
import type { Ref } from "vue";

type ApiUser = GetUserResponse | null;

type UseApiUserFetchResult = Omit<Awaited<AsyncData<ApiUser, FetchError>>, "clear">;

export type UseApiUserResult = UseApiUserFetchResult & {
    user: Ref<ApiUser>;
    sessionUser: ReturnType<typeof useUserSession>["user"];
    clear: ReturnType<typeof useUserSession>["clear"];
};

export async function useApiUser(options?: { lazy?: boolean }): Promise<UseApiUserResult> {
    const { user: sessionUser, clear: clearSession } = useUserSession();
    const userID = computed(() => sessionUser.value?.id);

    const fetchResult = await useFetch<ApiUser>(() => `/api/users/${userID.value}`, {
        lazy: options?.lazy ?? false,
        immediate: !!userID.value,
        watch: [userID],
        default: () => null,
    });

    if (!options?.lazy && userID.value && !fetchResult.data.value) {
        if (fetchResult.status.value === "idle") {
            await fetchResult.refresh();
        }

        if (fetchResult.status.value === "pending") {
            await new Promise<void>((resolve) => {
                const stop = watch(
                    fetchResult.status,
                    (status) => {
                        if (status !== "pending") {
                            stop();
                            resolve();
                        }
                    },
                );
            });
        }
    }

    return {
        ...fetchResult,
        user: fetchResult.data,
        sessionUser,
        clear: clearSession,
    };
}

export async function useApiUser() {
  const { user: sessionUser, clear } = useUserSession()
  const userID = computed(() => sessionUser.value?.id ?? 0)

  const { data, error, refresh } = await useFetch<GetUserResponse>(
    () => `/api/users/${userID.value}`
  )

  if (error.value) {
    throw error.value
  }

  return {
    user: data,
    refresh,
    clear,
  }
}

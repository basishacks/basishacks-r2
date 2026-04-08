<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
})

const { user: userRef } = useUserSession()
const userID = computed(() => userRef.value?.id ?? 0)

const { data: hackathon } = await useFetch('/api/hackathon')
if (hackathon.value?.status !== 'voting') {
  throw await navigateTo('/')
}

const { data: userData, error: userError } = await useFetch<GetUserResponse>(
  () => `/api/users/${userID.value}`,
)
if (userError.value) {
  throw userError.value
}
if (userData.value?.role !== 'admin' && userData.value?.role !== 'judge') {
  throw await navigateTo('/')
}

const { data, error, refresh } = await useFetch<APITeam[]>(
  '/api/teams?judging=1',
)
if (error.value) {
  throw error.value
}

async function onScored() {
  await withLoadingIndicator(async () => {
    await refresh()
  })
}
</script>

<template>
  <div class="mt-4">
    <h1 class="text-4xl text-primary bold glow mb-4">Judging</h1>
    <p v-if="!data">Loading projects...</p>
    <div v-else>
      <JudgingCard
        v-for="team in data"
        :key="team.id"
        :team="team"
        @scored="onScored"
      />
      <p v-if="!data?.length">No projects left to judge. Take a break!</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const { data: hackathon } = await useFetch('/api/hackathon')
if (hackathon.value?.status !== 'finished') {
  throw await navigateTo('/')
}

const { data, error } = await useFetch<APITeam[]>('/api/teams')
if (error.value) {
  throw error.value
}

// set the pathway automatically if known
const { user: userSession } = useUserSession()
const { data: userData } = await useFetch<GetUserResponse>(
  () => `/api/users/${userSession.value?.id}`,
)

const pathway = ref<TeamPathway>(userData.value?.team?.pathway || 'junior')

const sortedTeams = computed(() =>
  data
    .value!.filter((t) => t.project.submitted && t.pathway === pathway.value)
    .sort((a, b) => (a.rank || 1e9) - (b.rank || 1e9)),
)
</script>

<template>
  <div class="mt-4">
    <h1 class="text-4xl bold mb-4 glow text-primary">Results</h1>
    <p class="mb-4">
      Here are the results from
      <span class="text-primary glow">{{ WEBSITE_NAME }}</span
      >. Thank you to all of our participants and judges!
    </p>
    <div class="mb-4">
      Showing results for pathway:
      <USelect v-model="pathway" :items="['junior', 'senior']" />
    </div>

    <ul>
      <li v-for="team in sortedTeams" :key="team.id" class="mb-4">
        <ResultsCard :team="team" :rank="team.rank" />
      </li>
    </ul>
  </div>
</template>

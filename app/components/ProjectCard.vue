<script setup lang="ts">
const props = defineProps<{
  id: number
}>()

const { data: team } = await useFetch<GetTeamResponse>(() => '/api/teams/' + props.id)

console.log(team.value)
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="text-xl">Project</h3>
    </template>
    <template #description>
      <pre v-if="team">{{ team }}</pre>
    </template>
  </UCard>
</template>

<script setup lang="ts">
const { team, rank } = defineProps<{
  team: APITeam
  rank: number | null
}>()

const rankText = computed(() => rank ? `#${rank}. ` : '')
</script>

<template>
  <UCard variant="subtle" class="mb-4">
    <h2 class="bold text-2xl mb-2">{{ rankText }}{{ team.project.name }}</h2>
    <p class="mb-2">Team: {{ team.name }}</p>
    <pre class="my-4 mx-[2ch] text-wrap">{{ team.project.description }}</pre>
    <div class="flex flex-wrap gap-2">
      <UTooltip :text="team.project.repo_url!">
        <UButton
          variant="subtle"
          icon="i-material-symbols-merge"
          :href="team.project.repo_url!"
          external
          target="_blank"
          >Repo</UButton
        >
      </UTooltip>
      <UTooltip :text="team.project.demo_url!">
        <UButton
          variant="subtle"
          icon="i-material-symbols-play-arrow"
          :href="team.project.demo_url!"
          external
          target="_blank"
          >Demo</UButton
        >
      </UTooltip>
    </div>
  </UCard>
</template>

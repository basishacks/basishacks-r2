<script setup lang="ts">
const { project } = defineProps<{
  project: APITeam['project']
}>()
</script>

<template>
  <UCard variant="subtle">
    <h2 class="bold text-2xl mb-2 text-wrap">{{ project.name }}</h2>
    <pre class="my-4 mx-[2ch] text-wrap">{{ project.description }}</pre>
    <div class="flex flex-wrap gap-2">
      <UTooltip :text="project.repo_url!">
        <UButton
          variant="subtle"
          icon="i-material-symbols-merge"
          :href="project.repo_url!"
          external
          target="_blank"
          >Repo</UButton
        >
      </UTooltip>
      <UTooltip :text="project.demo_url!">
        <UButton
          variant="subtle"
          icon="i-material-symbols-play-arrow"
          :href="project.demo_url!"
          external
          target="_blank"
          >Demo</UButton
        >
      </UTooltip>
    </div>
  </UCard>
</template>

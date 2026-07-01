<script setup lang="ts">
import hackathonSeasons, { type HackathonSeason } from '~~/shared/seasons';

const props = defineProps<{
  season: BallotSummaryItem
}>()

const season_id = props.season.season_id
const season: HackathonSeason = hackathonSeasons[season_id] || {
    id: 1,
    theme_name: "Unknown Theme",
    theme_description: "...",
    date: "200 BCE",
    docs: null
  }
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex flex-col">
        <span class="text-lg font-semibold">{{ season.theme_name }}</span>
        <span class="text-sm text-muted">{{ season.date }}</span>
      </div>
    </template>
    <template #default>
      <div class="flex flex-col">
        <span class="text-sm bold text-muted">Rated / Total</span>
        <span class="text-3xl">
          <span class="text-primary bold">{{ props.season.scored_count }}</span>
          <span class="text-muted">/</span>
          <span class="bold">{{ props.season.submitted_count }}</span>
        </span>
      </div>
    </template>
  </UCard>
</template>

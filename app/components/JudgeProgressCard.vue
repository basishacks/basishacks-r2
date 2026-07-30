<script setup lang="ts">
const props = defineProps<{
    season: BallotSummaryItem;
}>();
</script>

<template>
    <UCard>
        <template #header>
            <div class="flex flex-col">
                <span class="text-lg font-semibold">{{ props.season.season_name }}</span>
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

<script setup lang="ts">
const { team, score, canIncrement, canDecrement } = defineProps<{
    team: APITeam;
    score: number;
    canIncrement: boolean;
    canDecrement: boolean;
}>();

const emit = defineEmits<{
    increment: [];
    decrement: [];
}>();
</script>

<template>
    <UCard variant="subtle" class="mb-4">
        <h2 class="bold text-2xl mb-2 text-wrap">{{ team.project.name }}</h2>
        <div class="flex flex-row items-baseline gap-4">
            <p class="mb-2">Team: {{ team.name }}</p>
            <UBadge
                v-if="team.pathway"
                variant="outline"
                :color="team.pathway == 'junior' ? 'primary' : 'warning'"
            >
                {{ team.pathway == "junior" ? "Junior" : "Senior" }}
            </UBadge>
        </div>
        <Comark class="my-4 mx-[2ch] text-wrap">{{ team.project.description }}</Comark>
        <div class="flex flex-wrap gap-2">
            <UTooltip :text="team.project.repo_url!">
                <UButton
                    variant="subtle"
                    icon="i-material-symbols-merge"
                    :href="team.project.repo_url!"
                    external
                    target="_blank"
                    :disabled="!team.project.repo_url"
                >
                    Repo
                </UButton>
            </UTooltip>
            <UTooltip :text="team.project.demo_url!">
                <UButton
                    variant="subtle"
                    icon="i-material-symbols-play-arrow"
                    :href="team.project.demo_url!"
                    external
                    target="_blank"
                    :disabled="!team.project.demo_url"
                >
                    Demo
                </UButton>
            </UTooltip>
        </div>

        <hr class="text-neutral-500 my-4" />

        <div class="flex items-center gap-4">
            <UButton
                icon="i-material-symbols-stat-minus-1"
                :disabled="!canDecrement"
                @click="emit('decrement')"
            />
            <UIcon name="i-material-symbols-star-rate" size="1.2em" class="text-yellow-300" />
            <span>{{ score }} / 5</span>
            <UButton
                icon="i-material-symbols-stat-1"
                :disabled="!canIncrement"
                @click="emit('increment')"
            />
        </div>
    </UCard>
</template>

<script setup lang="ts">
const props = defineProps<{
    id: number;
}>();

const { data: team } = await useFetch<GetTeamResponse>(() => "/api/teams/" + props.id);
</script>

<template>
    <UCard v-if="team" :description="team.name">
        <template #header>
            <h3 v-if="team.project.name" class="text-xl bold">{{ team.project.name }}</h3>
            <h3 v-else class="text-muted">(No Project Name)</h3>
            <span class="text-sm">Team:</span>
            <span v-if="team && team.name" class="text-muted text-sm">{{ team.name }}</span>
            <span v-else class="text-muted text-sm" (No Team Name)></span>
            <div class="flex flex-row gap-2 mt-2">
                <div v-for="award in team.awards">
                    <AwardButton :award="award" size="md"></AwardButton>
                </div>
            </div>
        </template>

        <template #default>
            <Comark v-if="team.project.description" class="whitespace-pre-wrap">
                {{ team.project.description }}
            </Comark>
            <p v-else class="text-muted">(No Project Description)</p>
        </template>

        <template #footer>
            <div class="flex flex-row gap-2">
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
        </template>

    </UCard>
</template>

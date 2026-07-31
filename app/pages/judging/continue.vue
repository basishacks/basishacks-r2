<script setup lang="ts">
import { hasPermission } from "~~/shared/permissions";

definePageMeta({
    middleware: ["auth"],
});

const { data: hackathon } = await useFetch("/api/seasons/active");
if (hackathon.value?.status !== "voting") {
    throw await navigateTo("/");
}

const { user: userData, error: userError } = await useApiUser();
if (userError.value) {
    throw userError.value;
}
if (
    !hasPermission(userData.value?.role, "admin") &&
    !hasPermission(userData.value?.role, "judge")
) {
    throw await navigateTo("/");
}

const { data, error, refresh } = await useFetch<APITeam[]>("/api/teams?judging=true");
if (error.value) {
    throw error.value;
}

async function onScored() {
    await withLoadingIndicator(async () => {
        await refresh();
    });
}
</script>

<template>
    <div class="mt-4">
        <h1 class="text-4xl text-primary bold glow mb-4">Judging</h1>

        <UAlert
            icon="i-lucide-book-open"
            color="info"
            variant="subtle"
            title="About AI Statement"
            description="Teams that testified to our request about AI usage will have their response present in blue boxes."
            class="mb-4"
        ></UAlert>

        <p v-if="!data">Loading projects...</p>
        <div v-else>
            <JudgingCard v-for="team in data" :key="team.id" :team="team" @scored="onScored" />
            <p v-if="!data?.length">No projects left to judge. Take a break!</p>
        </div>
    </div>
</template>

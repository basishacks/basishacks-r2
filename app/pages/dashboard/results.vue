<template>
    <h3 class="text-4xl bold text-primary glow w-[600px]">Results</h3>

    <USeparator class="my-6" />

    <h3 class="text-2xl bold">Current Results</h3>

    <div v-if="user?.team" class="mt-4">
        <ScoreCard v-if="user?.team" :team="user.team"></ScoreCard>
    </div>
    <p v-else class="text-muted">No scores for this season!</p>

    <USeparator class="my-6" />

    <h3 class="text-2xl bold">Past Seasons</h3>

    <div
        v-if="user?.past_teams?.length && user?.past_teams?.length > 0"
        class="flex flex-col gap-4 mt-4"
    >
        <ScoreCard v-for="team in user.past_teams!" :key="team.id" :team="team"></ScoreCard>
    </div>
    <p v-else class="text-muted">No scores for past seasons!</p>
</template>

<script setup lang="ts">
definePageMeta({
    layout: "dashboard",
    middleware: ["auth"],
});

const { user: userRef } = useUserSession();

const { data: user } = useFetch<GetUserResponse>(() => `/api/users/${userRef.value?.id}`, {
    lazy: true,
});
</script>

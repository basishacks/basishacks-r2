<script setup lang="ts">
import { hasPermission } from "~~/shared/permissions";

definePageMeta({
    layout: "default",
    middleware: ["auth"],
});

useHead({
    title: "All Ballots",
});

const { user: me } = await useApiUser();
if (!hasPermission(me.value?.role, "admin")) {
    await navigateTo("/");
}

const toast = useToast();

const {
    data: ballots,
    error: ballotsError,
    refresh: refreshBallots,
} = await useFetch<ElectionBallot[]>("/api/election/vote/all");

const { data: candidateData } = await useFetch<ElectionPosition[]>("/api/election/candidates");

if (ballotsError.value) {
    throw ballotsError.value;
}

const positions = computed(() => candidateData.value ?? []);

const candidateMap = computed(() => {
    const map = new Map<string, string>();
    for (const pos of positions.value) {
        for (const c of pos.candidates) {
            map.set(c.id, c.shortName);
        }
    }
    return map;
});

function formatDate(ts: number | null): string {
    if (!ts) return "-";
    return new Date(ts).toLocaleString();
}

function formatVote(position: ElectionPosition, vote: Record<string, number | null>): string {
    const ranked = position.candidates
        .map((c) => ({ id: c.id, rank: vote[c.id] }))
        .filter((c): c is { id: string; rank: number } => c.rank != null)
        .sort((a, b) => a.rank - b.rank);
    if (ranked.length === 0) return "Abstained";
    return ranked.map((r, i) => `${i + 1}. ${candidateMap.value.get(r.id) ?? r.id}`).join(", ");
}

async function onDelete(userId: number) {
    if (!confirm("Are you sure you want to delete this ballot?")) return;
    try {
        await $fetch(`/api/election/vote/${userId}`, {
            method: "DELETE",
        });
        toast.add({
            color: "success",
            title: "Ballot deleted",
        });
        await refreshBallots();
    } catch (e: any) {
        toast.add({
            color: "error",
            title: "Delete failed",
            description: e?.data?.statusMessage || e?.message || "Unknown error",
        });
    }
}
</script>

<template>
    <div class="min-h-screen p-6">
        <UContainer>
            <div class="flex items-center justify-between mb-6">
                <h1 class="text-4xl bold glow">All Ballots</h1>
                <UButton to="/temp/vote" variant="ghost" color="neutral">Back to voting</UButton>
            </div>

            <div v-if="!ballots || ballots.length === 0" class="text-neutral-500 italic">
                No ballots found.
            </div>

            <div v-else class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="border-b border-neutral-700">
                        <tr>
                            <th class="py-2 pr-4">User</th>
                            <th class="py-2 pr-4">Email</th>
                            <th class="py-2 pr-4">Submitted</th>
                            <th class="py-2 pr-4">Vote</th>
                            <th class="py-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="ballot in ballots"
                            :key="ballot.user_id"
                            class="border-b border-neutral-800"
                        >
                            <td class="py-2 pr-4">
                                {{ ballot.name ?? "Unknown" }}
                            </td>
                            <td class="py-2 pr-4">
                                {{ ballot.email ?? "-" }}
                            </td>
                            <td class="py-2 pr-4">
                                {{ formatDate(ballot.submitted_at) }}
                            </td>
                            <td class="py-2 pr-4">
                                <div
                                    v-for="position in positions"
                                    :key="position.title"
                                    class="mb-1"
                                >
                                    <span class="font-medium">{{ position.title }}:</span>
                                    <span class="text-neutral-400">
                                        {{ formatVote(position, ballot.vote) }}
                                    </span>
                                </div>
                            </td>
                            <td class="py-2">
                                <UButton
                                    size="xs"
                                    color="error"
                                    variant="ghost"
                                    @click="onDelete(ballot.user_id)"
                                >
                                    Delete
                                </UButton>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </UContainer>
    </div>
</template>

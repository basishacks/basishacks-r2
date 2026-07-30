<script setup lang="ts">
import { z } from "zod";

definePageMeta({
    layout: "dashboard",
    middleware: ["auth"],
});

useHead({
    title: `Admin | ${WEBSITE_NAME}`,
});

const { data: user } = await useApiUser();
if (!user.value || user.value.role !== "admin") {
    throw createError({ statusCode: 403, message: "Insufficient permissions" });
}

// ---------------------------------------------------------------------------
// Load current hackathon state and seasons
// ---------------------------------------------------------------------------
const { data: adminData, refresh: refreshAdmin } = await useFetch("/api/admin/hackathon");
const hackathon = computed(() => adminData.value?.hackathon ?? null);
const seasons = computed(() => adminData.value?.seasons ?? []);

// ---------------------------------------------------------------------------
// Hackathon config form
// ---------------------------------------------------------------------------
const hackathonForm = reactive<Record<string, any>>({});
const hackathonSaving = ref(false);
const hackathonMessage = ref("");

watch(
    hackathon,
    (h) => {
        if (h) Object.assign(hackathonForm, h);
    },
    { immediate: true },
);

async function saveHackathon() {
    hackathonSaving.value = true;
    hackathonMessage.value = "";
    try {
        const body: Record<string, any> = {};
        for (const [key, value] of Object.entries(hackathonForm)) {
            if (key === "id") continue;
            if (value !== (hackathon.value as any)?.[key]) body[key] = value;
        }
        if (Object.keys(body).length === 0) {
            hackathonMessage.value = "No changes to save.";
            return;
        }
        await $fetch("/api/admin/hackathon", { method: "PATCH", body });
        await refreshAdmin();
        hackathonMessage.value = "Hackathon config saved.";
    } catch (e: any) {
        hackathonMessage.value = e.data?.message || e.message || "Failed to save.";
    } finally {
        hackathonSaving.value = false;
    }
}

// ---------------------------------------------------------------------------
// Season management
// ---------------------------------------------------------------------------
const newSeasonName = ref("");
const seasonMessage = ref("");

async function createSeason() {
    if (!newSeasonName.value.trim()) return;
    seasonMessage.value = "";
    try {
        await $fetch("/api/admin/seasons", {
            method: "POST",
            body: { name: newSeasonName.value.trim() },
        });
        newSeasonName.value = "";
        await refreshAdmin();
        seasonMessage.value = "Season created.";
    } catch (e: any) {
        seasonMessage.value = e.data?.message || e.message || "Failed to create season.";
    }
}

async function activateSeason(id: number) {
    seasonMessage.value = "";
    try {
        await $fetch("/api/admin/seasons", {
            method: "PATCH",
            body: { id, is_active: 1 },
        });
        await refreshAdmin();
        seasonMessage.value = "Season activated.";
    } catch (e: any) {
        seasonMessage.value = e.data?.message || e.message || "Failed to activate season.";
    }
}

async function deactivateSeason(id: number) {
    seasonMessage.value = "";
    try {
        await $fetch("/api/admin/seasons", {
            method: "PATCH",
            body: { id, is_active: 0 },
        });
        await refreshAdmin();
        seasonMessage.value = "Season deactivated.";
    } catch (e: any) {
        seasonMessage.value = e.data?.message || e.message || "Failed.";
    }
}

async function deleteSeason(id: number) {
    if (!confirm("Delete this season? This cannot be undone.")) return;
    seasonMessage.value = "";
    try {
        await $fetch(`/api/admin/seasons/${id}`, { method: "DELETE" });
        await refreshAdmin();
        seasonMessage.value = "Season deleted.";
    } catch (e: any) {
        seasonMessage.value = e.data?.message || e.message || "Failed to delete season.";
    }
}

async function renameSeason(id: number, currentName: string) {
    const name = prompt("New season name:", currentName);
    if (!name || name === currentName) return;
    seasonMessage.value = "";
    try {
        await $fetch("/api/admin/seasons", {
            method: "PATCH",
            body: { id, name },
        });
        await refreshAdmin();
        seasonMessage.value = "Season renamed.";
    } catch (e: any) {
        seasonMessage.value = e.data?.message || e.message || "Failed.";
    }
}
</script>

<template>
    <div class="max-w-4xl mx-auto space-y-8">
        <h1 class="text-3xl bold">Admin Panel</h1>

        <!-- Hackathon Configuration -->
        <section v-if="hackathon" class="bg-ui-bg border border-ui-border rounded-lg p-6 space-y-4">
            <h2 class="text-xl bold">Hackathon Configuration</h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-1">Status</label>
                    <USelect
                        :items="[
                            { label: 'Not Started', value: 'not_started' },
                            { label: 'In Progress', value: 'in_progress' },
                            { label: 'Voting', value: 'voting' },
                            { label: 'Finished', value: 'finished' },
                            { label: 'Paused', value: 'paused' },
                        ]"
                        v-model="hackathonForm.status"
                    />
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1">Max Votes Per User</label>
                    <UInput
                        type="number"
                        v-model="hackathonForm.max_votes_per_user"
                        min="0"
                        max="100"
                    />
                </div>

                <div class="flex items-center gap-3">
                    <UCheckbox v-model="hackathonForm.voting_enabled" :binary="true" />
                    <span class="text-sm">Voting Enabled</span>
                </div>

                <div class="flex items-center gap-3">
                    <UCheckbox v-model="hackathonForm.judging_open" :binary="true" />
                    <span class="text-sm">Judging Open</span>
                </div>

                <div class="flex items-center gap-3">
                    <UCheckbox v-model="hackathonForm.results_published" :binary="true" />
                    <span class="text-sm">Results Published</span>
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1">Theme Name</label>
                    <UInput v-model="hackathonForm.theme_name" />
                </div>

                <div class="md:col-span-2">
                    <label class="block text-sm font-medium mb-1">Theme Description</label>
                    <UTextarea v-model="hackathonForm.theme_description" rows="2" />
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1">Schedule Start</label>
                    <UInput v-model="hackathonForm.schedule_start" />
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1">Schedule End</label>
                    <UInput v-model="hackathonForm.schedule_end" />
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1">Start Timestamp</label>
                    <UInput type="number" v-model="hackathonForm.start_timestamp" />
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1">End Timestamp</label>
                    <UInput type="number" v-model="hackathonForm.end_timestamp" />
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1">Voting Start</label>
                    <UInput type="number" v-model="hackathonForm.voting_start_timestamp" />
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1">Voting End</label>
                    <UInput type="number" v-model="hackathonForm.voting_end_timestamp" />
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1">Results Open Timestamp</label>
                    <UInput type="number" v-model="hackathonForm.results_open_timestamp" />
                </div>
            </div>

            <div class="flex items-center gap-3">
                <UButton @click="saveHackathon" :loading="hackathonSaving" color="primary">
                    Save Changes
                </UButton>
                <span
                    v-if="hackathonMessage"
                    class="text-sm"
                    :class="hackathonMessage.includes('Failed') ? 'text-red-500' : 'text-green-500'"
                >
                    {{ hackathonMessage }}
                </span>
            </div>
        </section>

        <!-- Season Management -->
        <section class="bg-ui-bg border border-ui-border rounded-lg p-6 space-y-4">
            <h2 class="text-xl bold">Seasons</h2>

            <div class="flex items-center gap-3">
                <UInput v-model="newSeasonName" placeholder="New season name" class="flex-1" />
                <UButton @click="createSeason" color="primary">Add Season</UButton>
            </div>
            <span
                v-if="seasonMessage"
                class="text-sm"
                :class="seasonMessage.includes('Failed') ? 'text-red-500' : 'text-green-500'"
            >
                {{ seasonMessage }}
            </span>

            <UTable :items="seasons" v-if="seasons.length > 0">
                <template #header>
                    <tr>
                        <th>Name</th>
                        <th>Active</th>
                        <th>Actions</th>
                    </tr>
                </template>
                <template #body>
                    <tr v-for="s in seasons" :key="s.id">
                        <td>{{ s.name }}</td>
                        <td>
                            <UBadge v-if="s.is_active" color="success" variant="solid">
                                Active
                            </UBadge>
                            <UBadge v-else color="neutral" variant="outline">Inactive</UBadge>
                        </td>
                        <td class="flex gap-2">
                            <UButton v-if="!s.is_active" size="sm" @click="activateSeason(s.id)">
                                Activate
                            </UButton>
                            <UButton
                                v-if="s.is_active"
                                size="sm"
                                variant="outline"
                                @click="deactivateSeason(s.id)"
                            >
                                Deactivate
                            </UButton>
                            <UButton
                                size="sm"
                                variant="outline"
                                @click="renameSeason(s.id, s.name)"
                            >
                                Rename
                            </UButton>
                            <UButton
                                size="sm"
                                color="error"
                                variant="outline"
                                @click="deleteSeason(s.id)"
                            >
                                Delete
                            </UButton>
                        </td>
                    </tr>
                </template>
            </UTable>
            <p v-else class="text-sm text-ui-text-muted">No seasons yet.</p>
        </section>
    </div>
</template>

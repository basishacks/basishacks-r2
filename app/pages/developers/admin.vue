<script setup lang="ts">
definePageMeta({
    layout: "developers-dashboard",
    middleware: ["auth"],
});

useHead({
    title: `Hackathon Administration | ${WEBSITE_NAME}`,
});

const toast = useToast();
const { data: user, status } = await useApiUser();

// Hard 403 for non-admin users
if (status.value !== "pending" && status.value !== "idle") {
    if (!user.value || user.value.role !== "admin") {
        throw createError({ statusCode: 403, statusMessage: "Access Denied" });
    }
}

// ---------------------------------------------------------------------------
// Load current hackathon state and seasons
// ---------------------------------------------------------------------------
const { data: adminData, refresh: refreshAdmin } = await useFetch("/api/admin/hackathon");
const hackathon = computed(() => adminData.value?.hackathon ?? null);
const seasons = computed(() => adminData.value?.seasons ?? []);

// ---------------------------------------------------------------------------
// Helpers: convert ms epoch <-> datetime-local string
// The hackathon table stores timestamps as JavaScript Date.now() epoch (ms).
// ---------------------------------------------------------------------------
function tsToDatetime(ts: number | null | undefined): string {
    if (!ts) return "";
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeToTs(s: string): number {
    if (!s) return 0;
    return new Date(s).getTime();
}

// ---------------------------------------------------------------------------
// Hackathon config form
// ---------------------------------------------------------------------------
const hackathonForm = reactive<Record<string, any>>({});
const hackathonSaving = ref(false);
const hackathonMessage = ref("");

watch(
    hackathon,
    (h) => {
        if (h) {
            // Convert timestamps to datetime-local strings for display
            const raw: Record<string, any> = { ...h };
            for (const key of [
                "start_timestamp",
                "end_timestamp",
                "voting_start_timestamp",
                "voting_end_timestamp",
                "results_open_timestamp",
            ]) {
                raw[key] = tsToDatetime(raw[key]);
            }
            Object.assign(hackathonForm, raw);
        }
    },
    { immediate: true },
);

const tsKeys = [
    "start_timestamp",
    "end_timestamp",
    "voting_start_timestamp",
    "voting_end_timestamp",
    "results_open_timestamp",
] as const;

async function saveHackathon() {
    hackathonSaving.value = true;
    hackathonMessage.value = "";
    try {
        const body: Record<string, any> = {};
        for (const [key, value] of Object.entries(hackathonForm)) {
            if (key === "id") continue;
            // Convert datetime-local strings back to unix timestamps
            let val = tsKeys.includes(key as any) ? datetimeToTs(value as string) : value;
            // UCheckbox with :binary emits booleans; API expects 0/1
            if (typeof val === "boolean") val = val ? 1 : 0;
            if (val !== (hackathon.value as any)?.[key]) body[key] = val;
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
// Active season selector
// ---------------------------------------------------------------------------
const activeSeasonId = ref<number | null>(null);

watch(
    () => seasons.value,
    (s) => {
        const active = s?.find((s: any) => s.is_active);
        activeSeasonId.value = active?.id ?? null;
    },
    { immediate: true },
);

const activeSeasonItems = computed(() => [
    { label: "None", value: null },
    ...(seasons.value?.map((s: { id: number; name: string }) => ({ label: s.name, value: s.id })) ||
        []),
]);

const activeSeasonSaving = ref(false);

// ---------------------------------------------------------------------------
// Theme name dropdown: pick from existing season names or enter custom
// ---------------------------------------------------------------------------
const themeSelectMode = ref("__custom__");

watch(
    () => hackathon.value?.theme_name,
    (name) => {
        if (name) {
            const match = seasons.value?.find((s: any) => s.name === name);
            themeSelectMode.value = match ? name : "__custom__";
        } else {
            themeSelectMode.value = "__custom__";
        }
    },
    { immediate: true },
);

const themeOptions = computed(() => {
    const current = hackathonForm.theme_name;
    const seasonNames = (seasons.value || []).map((s: any) => ({
        label: s.name,
        value: s.name,
    }));
    const items = [
        ...(current && !seasonNames.find((o: any) => o.value === current)
            ? [{ label: `Custom: "${current}"`, value: "__custom__" as const }]
            : [{ label: "Custom...", value: "__custom__" as const }]),
        ...(seasonNames.length
            ? [{ label: "──────────", value: "__sep__" as const, disabled: true }]
            : []),
        ...seasonNames,
        { label: "──────────", value: "__sep__", disabled: true },
        { label: "Create new season...", value: "__create__" as const },
    ];
    return items;
});

watch(themeSelectMode, async (mode) => {
    if (mode === "__create__") {
        const name = prompt("New season name:");
        if (name && name.trim()) {
            try {
                await $fetch("/api/admin/seasons", {
                    method: "POST",
                    body: { name: name.trim() },
                });
                await refreshAdmin();
                toast.add({ title: `Season "${name}" created.`, color: "success" });
                hackathonForm.theme_name = name.trim();
            } catch (e: any) {
                toast.add({ title: "Error", description: getErrorMessage(e), color: "error" });
            }
        }
        themeSelectMode.value = hackathonForm.theme_name || "__custom__";
    } else if (mode !== "__custom__") {
        hackathonForm.theme_name = mode;
    }
});

async function setActiveSeason() {
    activeSeasonSaving.value = true;
    try {
        await $fetch("/api/seasons/active", {
            method: "PATCH",
            body: { season_id: activeSeasonId.value },
        });
        await refreshAdmin();
        toast.add({ title: "Active season updated.", color: "success" });
    } catch (e: any) {
        toast.add({ title: "Error", description: getErrorMessage(e), color: "error" });
    } finally {
        activeSeasonSaving.value = false;
    }
}

// ---------------------------------------------------------------------------
// Season CRUD
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
    <UDashboardPanel id="hackathon-admin">
        <template #header>
            <UDashboardNavbar title="Hackathon Administration">
                <template #leading>
                    <UDashboardSidebarCollapse />
                </template>
            </UDashboardNavbar>
        </template>

        <template #body>
            <!-- Hackathon Configuration -->
            <section v-if="hackathon" class="bg-ui-bg border-b border-ui-border p-6 space-y-4">
                <h2 class="text-xl font-semibold">Hackathon Configuration</h2>

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
                            class="w-full"
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
                        <div class="flex items-center gap-2">
                            <USelect
                                v-model="themeSelectMode"
                                :items="themeOptions"
                                class="flex-1"
                            />
                            <UInput
                                v-if="themeSelectMode === '__custom__'"
                                v-model="hackathonForm.theme_name"
                                placeholder="Custom theme name"
                                class="flex-1"
                            />
                        </div>
                    </div>

                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium mb-1">Theme Description</label>
                        <UTextarea v-model="hackathonForm.theme_description" rows="2" />
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-1">Schedule Start</label>
                        <UInput type="datetime-local" v-model="hackathonForm.schedule_start" />
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-1">Schedule End</label>
                        <UInput type="datetime-local" v-model="hackathonForm.schedule_end" />
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-1">Start</label>
                        <UInput type="datetime-local" v-model="hackathonForm.start_timestamp" />
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-1">End</label>
                        <UInput type="datetime-local" v-model="hackathonForm.end_timestamp" />
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-1">Voting Start</label>
                        <UInput
                            type="datetime-local"
                            v-model="hackathonForm.voting_start_timestamp"
                        />
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-1">Voting End</label>
                        <UInput
                            type="datetime-local"
                            v-model="hackathonForm.voting_end_timestamp"
                        />
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-1">Results Open</label>
                        <UInput
                            type="datetime-local"
                            v-model="hackathonForm.results_open_timestamp"
                        />
                    </div>
                </div>

                <div class="flex items-center gap-3 pt-2">
                    <UButton @click="saveHackathon" :loading="hackathonSaving" color="primary">
                        Save Changes
                    </UButton>
                    <span
                        v-if="hackathonMessage"
                        class="text-sm"
                        :class="
                            hackathonMessage.includes('Failed') ? 'text-red-500' : 'text-green-500'
                        "
                    >
                        {{ hackathonMessage }}
                    </span>
                </div>
            </section>

            <!-- Active Season Selector -->
            <section class="bg-ui-bg border-b border-ui-border p-6 space-y-4">
                <h2 class="text-xl font-semibold">Active Season</h2>
                <p class="text-sm text-ui-text-muted">
                    Select the currently active season. Only one season can be active at a time.
                </p>
                <div class="flex items-center gap-3">
                    <USelect
                        v-model="activeSeasonId"
                        :items="activeSeasonItems"
                        class="w-full max-w-xs"
                    />
                    <UButton @click="setActiveSeason" :loading="activeSeasonSaving" color="primary">
                        Set Active
                    </UButton>
                </div>
            </section>

            <!-- Season Management -->
            <section class="bg-ui-bg p-6 space-y-4">
                <h2 class="text-xl font-semibold">Season Management</h2>

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
                                <UButton
                                    v-if="!s.is_active"
                                    size="sm"
                                    @click="activateSeason(s.id)"
                                >
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
        </template>
    </UDashboardPanel>
</template>

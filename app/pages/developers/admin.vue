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

if (status.value !== "pending" && status.value !== "idle") {
    if (!user.value || user.value.role !== "admin") {
        throw createError({ statusCode: 403, statusMessage: "Access Denied" });
    }
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const { data: adminData, refresh: refreshAdmin } = await useFetch("/api/admin/hackathon");
const hackathon = computed(() => adminData.value?.hackathon ?? null);
const seasons = computed(() => adminData.value?.seasons ?? []);

// ---------------------------------------------------------------------------
// Helpers: ms epoch <-> datetime-local
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

const tsKeys = [
    "start_timestamp",
    "end_timestamp",
    "voting_start_timestamp",
    "voting_end_timestamp",
    "results_open_timestamp",
] as const;

const configKeys = [
    "status",
    "voting_enabled",
    "judging_open",
    "results_published",
    "max_votes_per_user",
    "theme_name",
    "theme_description",
    "schedule_start",
    "schedule_end",
    ...tsKeys,
] as const;

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------
const hackathonForm = reactive<Record<string, any>>({});
const hackathonSaving = ref(false);
const hackathonMessage = ref("");

/** True after the very first restore has been applied (avoids overwriting on initial load). */
const formInitialized = ref(false);

/** Populate the form from a season row, falling back to the global hackathon for default values. */
function restoreSeasonConfig(season: any) {
    if (!season) return;
    for (const key of configKeys) {
        const val = season[key];
        if (val === undefined) continue;

        // Null text fields → empty string
        if (val === null) {
            hackathonForm[key] = "";
            continue;
        }

        // Use the season's non-default value; for defaults, leave the current form value
        // (which was set from the global hackathon row).
        if (isDefaultValue(key, val)) continue;

        hackathonForm[key] = tsKeys.includes(key as any) ? tsToDatetime(val) : val;
    }
}

function isDefaultValue(key: string, val: any): boolean {
    if (key === "status") return val === "not_started";
    if (key === "max_votes_per_user") return val === 0;
    if (["voting_enabled", "judging_open", "results_published"].includes(key)) return val === 0;
    if (tsKeys.includes(key as any)) return val === 0;
    return false;
}

/** Initialize form from the global hackathon, then overlay the active season's overrides. */
function applyConfig(seasonId: number | null) {
    const h = hackathon.value;
    if (!h) return; // data not loaded yet

    // Always start from the global hackathon values
    const raw: Record<string, any> = { ...h };
    for (const key of tsKeys) raw[key] = tsToDatetime(raw[key]);
    Object.assign(hackathonForm, raw);

    // Overlay season-specific overrides if a season is selected
    if (seasonId !== null) {
        const s = seasons.value?.find((s: any) => s.id === seasonId);
        if (s) restoreSeasonConfig(s);
    }

    formInitialized.value = true;
}

async function saveHackathon() {
    hackathonSaving.value = true;
    hackathonMessage.value = "";
    try {
        const baseline = hackathon.value;
        const body: Record<string, any> = {};
        for (const [key, value] of Object.entries(hackathonForm)) {
            if (key === "id" || key === "season_id") continue;
            // Convert timestamps: string → number, null/undefined → 0
            let val = tsKeys.includes(key as any) ? datetimeToTs(value as string) : value;
            if (typeof val === "boolean") val = val ? 1 : 0;
            // Never send null/undefined for any field
            if (val === null || val === undefined) val = 0;
            if (val !== (baseline as any)?.[key]) body[key] = val;
        }
        if (Object.keys(body).length === 0) {
            hackathonMessage.value = "No changes to save.";
            return;
        }
        // Tag with season_id so the backend knows which season to persist to
        if (activeSeasonId.value !== null) body.season_id = activeSeasonId.value;
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
// Active season — picker at top, activates on "Set Active"
// ---------------------------------------------------------------------------
const activeSeasonId = ref<number | null>(null);

// One-time initialization: wait for both hackathon and seasons to load
watchEffect(() => {
    const h = hackathon.value;
    const s = seasons.value;
    if (!h || !s || s.length === 0 || formInitialized.value) return;
    const active = s.find((s: any) => s.is_active);
    activeSeasonId.value = active?.id ?? null;
    applyConfig(activeSeasonId.value);
});

watch(
    () => seasons.value,
    (s) => {
        const newId = s?.find((s: any) => s.is_active)?.id ?? null;
        activeSeasonId.value = newId;
    },
);

const activeSeasonItems = computed(() => [
    { label: "None", value: null },
    ...(seasons.value?.map((s: { id: number; name: string }) => ({ label: s.name, value: s.id })) ||
        []),
]);

// ---------------------------------------------------------------------------
// Season name — separate editable field to rename the selected season
// ---------------------------------------------------------------------------
const seasonNameForm = ref("");

watch(activeSeasonId, (id) => {
    // Update season name
    seasonNameForm.value = seasons.value?.find((s: any) => s.id === id)?.name ?? "";
    // Re-apply the full config (global + season overrides). When id is null,
    // applyConfig skips the overlay, showing only the global hackathon values.
    applyConfig(id);
});

const seasonNameSaving = ref(false);

async function renameSeason() {
    if (activeSeasonId.value === null || !seasonNameForm.value.trim()) return;
    seasonNameSaving.value = true;
    try {
        await $fetch("/api/admin/seasons", {
            method: "PATCH",
            body: { id: activeSeasonId.value, name: seasonNameForm.value.trim() },
        });
        await refreshAdmin();
        toast.add({ title: "Season renamed.", color: "success" });
    } catch (e: any) {
        toast.add({ title: "Error", description: getErrorMessage(e), color: "error" });
    } finally {
        seasonNameSaving.value = false;
    }
}

async function setActiveSeason() {
    if (activeSeasonId.value === null) return;
    try {
        await $fetch("/api/seasons/active", {
            method: "PATCH",
            body: { season_id: activeSeasonId.value },
        });
        await refreshAdmin();
        toast.add({ title: "Active season updated.", color: "success" });
    } catch (e: any) {
        toast.add({ title: "Error", description: getErrorMessage(e), color: "error" });
    }
}

// ---------------------------------------------------------------------------
// New season — prompts then adds to the dropdown
// ---------------------------------------------------------------------------
async function addSeason() {
    const name = prompt("New season name:");
    if (!name || !name.trim()) return;
    try {
        await $fetch("/api/admin/seasons", { method: "POST", body: { name: name.trim() } });
        await refreshAdmin();
        toast.add({ title: `Season "${name}" created.`, color: "success" });
    } catch (e: any) {
        toast.add({ title: "Error", description: getErrorMessage(e), color: "error" });
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
            <!-- Season picker at the top -->
            <section class="bg-ui-bg border-b border-ui-border p-6">
                <h2 class="text-xl font-semibold mb-3">Season</h2>
                <div class="flex items-center gap-3">
                    <USelect
                        v-model="activeSeasonId"
                        :items="activeSeasonItems"
                        class="w-full max-w-xs"
                    />
                    <UButton @click="setActiveSeason" color="primary">Set Active</UButton>
                    <UButton @click="addSeason" variant="outline">+ New Season</UButton>
                </div>
            </section>

            <!-- Season Name (rename active season) -->
            <section class="bg-ui-bg border-b border-ui-border p-6">
                <h2 class="text-xl font-semibold mb-3">Season Name</h2>
                <div class="flex items-center gap-3">
                    <UInput v-model="seasonNameForm" class="flex-1 max-w-xs" />
                    <UButton @click="renameSeason" :loading="seasonNameSaving" color="primary">
                        Rename Season
                    </UButton>
                </div>
            </section>

            <!-- Hackathon Configuration -->
            <section v-if="hackathon" class="bg-ui-bg p-6 space-y-4">
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
                        <UInput v-model="hackathonForm.theme_name" />
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

            <!-- Database Export -->
            <section class="bg-ui-bg border-t border-ui-border p-6 space-y-3">
                <h2 class="text-xl font-semibold">Database Export</h2>
                <p class="text-sm text-ui-text-muted">Download a full snapshot of the database.</p>
                <div class="flex items-center gap-3">
                    <UButton
                        tag="a"
                        :to="`/api/admin/database/export?format=sqlite`"
                        target="_blank"
                        color="primary"
                        variant="solid"
                    >
                        Download SQLite
                    </UButton>
                    <UButton
                        tag="a"
                        :to="`/api/admin/database/export?format=csv`"
                        target="_blank"
                        color="neutral"
                        variant="outline"
                    >
                        Download CSV
                    </UButton>
                </div>
            </section>
        </template>
    </UDashboardPanel>
</template>

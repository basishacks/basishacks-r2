<script setup lang="ts">
import { hasPermission, DevPermissions } from "~~/shared/permissions";
import { SetActiveSeasonRequest } from "~~/shared/schemas";
import type { FormSubmitEvent } from "@nuxt/ui";

definePageMeta({
    layout: "developers-dashboard",
});

const toast = useToast();

const { user: me } = await useApiUser();
if (
    !hasPermission(me.value?.role, DevPermissions.PORTAL_SEASONS_VIEW) &&
    !hasPermission(me.value?.role, "admin")
) {
    useToast().add({
        title: "Access denied",
        description: "You do not have permission to view seasons.",
        color: "error",
    });
    throw await navigateTo("/developers");
}

const { data: seasons, refresh } = await useFetch<Season[]>("/api/seasons", {
    lazy: true,
});
const { data: activeSeason } = await useFetch<Season | null>("/api/seasons/active", {
    lazy: true,
});

const state = reactive<{
    season_id: number | null;
}>({
    season_id: activeSeason.value?.id ?? null,
});

watch(activeSeason, (newVal) => {
    state.season_id = newVal?.id ?? null;
});

const seasonItems = computed(() => [
    { label: "None", value: null },
    ...(seasons.value?.map((s) => ({ label: s.name, value: s.id })) || []),
]);

const canEdit = computed(() => {
    return (
        hasPermission(me.value?.role, DevPermissions.PORTAL_SEASONS_EDIT) ||
        hasPermission(me.value?.role, "admin")
    );
});

const saving = ref(false);

async function onSubmit(event: FormSubmitEvent<typeof state>) {
    saving.value = true;
    try {
        await $fetch("/api/seasons/active", {
            method: "PATCH",
            body: { season_id: event.data.season_id },
        });
        toast.add({ title: "Success", description: "Active season updated.", color: "success" });
        await refresh();
    } catch (e) {
        toast.add({ title: "Error", description: getErrorMessage(e), color: "error" });
    } finally {
        saving.value = false;
    }
}

const statusItems = [
    { label: "Not started", value: "not_started" },
    { label: "In progress", value: "in_progress" },
    { label: "Voting", value: "voting" },
    { label: "Finished", value: "finished" },
    { label: "Paused", value: "paused" },
];

function tsToInput(ts: number | null | undefined): string {
    if (!ts) return "";
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function inputToTs(value: string): number | undefined {
    return value ? new Date(value).getTime() : undefined;
}

const settingsState = reactive({
    status: undefined as HackathonStatus | undefined,
    show_scores: false,
    show_ranking: false,
    voting_enabled: false,
    results_published: false,
    judging_open: false,
    max_votes_per_user: undefined as number | undefined,
    schedule_start: undefined as string | undefined,
    schedule_end: undefined as string | undefined,
    start_timestamp: "",
    end_timestamp: "",
    voting_start_timestamp: "",
    voting_end_timestamp: "",
    results_open_timestamp: "",
    theme_name: undefined as string | undefined,
    theme_description: undefined as string | undefined,
});

const editingSeasonId = ref<number | undefined>(undefined);

watch(
    activeSeason,
    (newVal) => {
        if (editingSeasonId.value == null) {
            editingSeasonId.value = newVal?.id ?? undefined;
        }
    },
    { immediate: true },
);

const tweakSeasonItems = computed(
    () => seasons.value?.map((s) => ({ label: s.name, value: s.id })) || [],
);

const isLiveSeason = computed(
    () => editingSeasonId.value != null && editingSeasonId.value === activeSeason.value?.id,
);

const tweaksData = ref<Season | null>(null);

async function fetchTweaks() {
    if (editingSeasonId.value == null) {
        tweaksData.value = null;
        return;
    }
    try {
        tweaksData.value = await $fetch<Season>(`/api/seasons/${editingSeasonId.value}/tweaks`);
    } catch (e) {
        tweaksData.value = null;
        toast.add({ title: "Error", description: getErrorMessage(e), color: "error" });
    }
}

watch(editingSeasonId, fetchTweaks, { immediate: true });

watch(tweaksData, (newVal) => {
    if (!newVal) return;
    settingsState.status = newVal.status as HackathonStatus;
    settingsState.show_scores = !!newVal.show_scores;
    settingsState.show_ranking = !!newVal.show_ranking;
    settingsState.voting_enabled = !!newVal.voting_enabled;
    settingsState.results_published = !!newVal.results_published;
    settingsState.judging_open = !!newVal.judging_open;
    settingsState.max_votes_per_user = newVal.max_votes_per_user;
    settingsState.schedule_start = newVal.schedule_start ?? undefined;
    settingsState.schedule_end = newVal.schedule_end ?? undefined;
    settingsState.start_timestamp = tsToInput(newVal.start_timestamp);
    settingsState.end_timestamp = tsToInput(newVal.end_timestamp);
    settingsState.voting_start_timestamp = tsToInput(newVal.voting_start_timestamp);
    settingsState.voting_end_timestamp = tsToInput(newVal.voting_end_timestamp);
    settingsState.results_open_timestamp = tsToInput(newVal.results_open_timestamp);
    settingsState.theme_name = newVal.theme_name ?? undefined;
    settingsState.theme_description = newVal.theme_description ?? undefined;
});

const savingSettings = ref(false);

async function onSettingsSubmit() {
    if (editingSeasonId.value == null) return;
    savingSettings.value = true;
    try {
        await $fetch(`/api/seasons/${editingSeasonId.value}/tweaks`, {
            method: "PATCH",
            body: {
                status: settingsState.status,
                show_scores: settingsState.show_scores,
                show_ranking: settingsState.show_ranking,
                voting_enabled: settingsState.voting_enabled,
                results_published: settingsState.results_published,
                judging_open: settingsState.judging_open,
                max_votes_per_user: settingsState.max_votes_per_user,
                schedule_start: settingsState.schedule_start || null,
                schedule_end: settingsState.schedule_end || null,
                start_timestamp: inputToTs(settingsState.start_timestamp),
                end_timestamp: inputToTs(settingsState.end_timestamp),
                voting_start_timestamp: inputToTs(settingsState.voting_start_timestamp),
                voting_end_timestamp: inputToTs(settingsState.voting_end_timestamp),
                results_open_timestamp: inputToTs(settingsState.results_open_timestamp),
                theme_name: settingsState.theme_name || null,
                theme_description: settingsState.theme_description || null,
            },
        });
        toast.add({
            title: "Success",
            description: isLiveSeason.value
                ? "Season tweaks updated. The live season was updated immediately."
                : "Season tweaks updated.",
            color: "success",
        });
        await fetchTweaks();
    } catch (e) {
        toast.add({ title: "Error", description: getErrorMessage(e), color: "error" });
    } finally {
        savingSettings.value = false;
    }
}
</script>

<template>
    <UDashboardPanel id="seasons">
        <template #header>
            <UDashboardNavbar title="Seasons">
                <template #leading>
                    <UDashboardSidebarCollapse />
                </template>
            </UDashboardNavbar>
        </template>

        <template #body>
            <div class="space-y-6">
                <UCard>
                    <template #header>
                        <h2 class="text-lg font-semibold">Active Season</h2>
                    </template>

                    <UForm
                        :schema="SetActiveSeasonRequest"
                        :state="state"
                        class="space-y-4"
                        @submit="onSubmit"
                    >
                        <UFormField name="season_id" label="Current Season">
                            <USelect
                                v-model="state.season_id"
                                :items="seasonItems"
                                class="w-full"
                            />
                        </UFormField>

                        <UButton type="submit" :disabled="!canEdit" :loading="saving">Save</UButton>
                    </UForm>
                </UCard>

                <UCard>
                    <template #header>
                        <h2 class="text-lg font-semibold">Season Tweaks</h2>
                    </template>

                    <UForm :state="settingsState" class="space-y-4" @submit="onSettingsSubmit">
                        <UFormField name="editing_season" label="Season to edit">
                            <USelect
                                v-model="editingSeasonId"
                                :items="tweakSeasonItems"
                                class="w-full"
                            />
                        </UFormField>

                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <UFormField
                                name="show_scores"
                                label="Show scores for participants in results"
                            >
                                <USwitch v-model="settingsState.show_scores" />
                            </UFormField>

                            <UFormField
                                name="show_ranking"
                                label="Show ranking for participants in results"
                            >
                                <USwitch v-model="settingsState.show_ranking" />
                            </UFormField>

                            <UFormField name="voting_enabled" label="Voting enabled">
                                <USwitch v-model="settingsState.voting_enabled" />
                            </UFormField>

                            <UFormField name="results_published" label="Results published">
                                <USwitch v-model="settingsState.results_published" />
                            </UFormField>

                            <UFormField name="judging_open" label="Judging open">
                                <USwitch v-model="settingsState.judging_open" />
                            </UFormField>

                            <UFormField name="status" label="Status">
                                <USelect
                                    v-model="settingsState.status"
                                    :items="statusItems"
                                    class="w-full"
                                />
                            </UFormField>

                            <UFormField name="max_votes_per_user" label="Max votes per user">
                                <UInput
                                    v-model.number="settingsState.max_votes_per_user"
                                    type="number"
                                    min="0"
                                    class="w-full"
                                />
                            </UFormField>

                            <UFormField name="schedule_start" label="Schedule start">
                                <UInput v-model="settingsState.schedule_start" class="w-full" />
                            </UFormField>

                            <UFormField name="schedule_end" label="Schedule end">
                                <UInput v-model="settingsState.schedule_end" class="w-full" />
                            </UFormField>

                            <UFormField name="start_timestamp" label="Start time">
                                <UInput
                                    v-model="settingsState.start_timestamp"
                                    type="datetime-local"
                                    class="w-full"
                                />
                            </UFormField>

                            <UFormField name="end_timestamp" label="End time">
                                <UInput
                                    v-model="settingsState.end_timestamp"
                                    type="datetime-local"
                                    class="w-full"
                                />
                            </UFormField>

                            <UFormField name="voting_start_timestamp" label="Voting start time">
                                <UInput
                                    v-model="settingsState.voting_start_timestamp"
                                    type="datetime-local"
                                    class="w-full"
                                />
                            </UFormField>

                            <UFormField name="voting_end_timestamp" label="Voting end time">
                                <UInput
                                    v-model="settingsState.voting_end_timestamp"
                                    type="datetime-local"
                                    class="w-full"
                                />
                            </UFormField>

                            <UFormField name="results_open_timestamp" label="Results open time">
                                <UInput
                                    v-model="settingsState.results_open_timestamp"
                                    type="datetime-local"
                                    class="w-full"
                                />
                            </UFormField>

                            <UFormField name="theme_name" label="Theme name">
                                <UInput v-model="settingsState.theme_name" class="w-full" />
                            </UFormField>
                        </div>

                        <UFormField name="theme_description" label="Theme description">
                            <UTextarea
                                v-model="settingsState.theme_description"
                                :rows="4"
                                class="w-full"
                            />
                        </UFormField>

                        <UButton
                            type="submit"
                            :disabled="!canEdit || editingSeasonId == null"
                            :loading="savingSettings"
                        >
                            Save Tweaks
                        </UButton>

                        <UAlert
                            v-if="isLiveSeason"
                            color="warning"
                            variant="subtle"
                            icon="i-lucide-triangle-alert"
                            title="You are editing the LIVE season"
                            description="This season is currently active. Changes will take effect immediately on the ongoing hackathon."
                        />
                    </UForm>
                </UCard>
            </div>
        </template>
    </UDashboardPanel>
</template>

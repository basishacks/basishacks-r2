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

const settingsState = reactive({
    status: undefined as HackathonStatus | undefined,
    show_scores: false,
    show_ranking: false,
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

                            <UFormField name="status" label="Status">
                                <USelect
                                    v-model="settingsState.status"
                                    :items="statusItems"
                                    class="w-full"
                                />
                            </UFormField>
                        </div>

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

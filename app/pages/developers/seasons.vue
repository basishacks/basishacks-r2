<script setup lang="ts">
import { hasPermission, DevPermissions } from '~~/shared/permissions'
import { SetActiveSeasonRequest } from '~~/shared/schemas'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'developers-dashboard'
})

const toast = useToast()

const { user: me } = await useApiUser()
if (!hasPermission(me.value?.role, DevPermissions.PORTAL_SEASONS_VIEW) && !hasPermission(me.value?.role, 'admin')) {
  await navigateTo('/developers')
  useToast().add({ title: 'Access denied', description: 'You do not have permission to view seasons.', color: 'error' })
}

const { data: seasons, refresh } = await useFetch<Season[]>('/api/seasons', {
  lazy: true
})
const { data: activeSeason } = await useFetch<Season | null>('/api/seasons/active', {
  lazy: true
})

const state = reactive<{
  season_id: number | null
}>({
  season_id: activeSeason.value?.id ?? null,
})

watch(activeSeason, (newVal) => {
  state.season_id = newVal?.id ?? null
})

const seasonItems = computed(() => [
  { label: 'None', value: null },
  ...(seasons.value?.map((s) => ({ label: s.name, value: s.id })) || [])
])

const canEdit = computed(() => {
  return hasPermission(me.value?.role, DevPermissions.PORTAL_SEASONS_EDIT) || hasPermission(me.value?.role, 'admin')
})

const saving = ref(false)

async function onSubmit(event: FormSubmitEvent<typeof state>) {
  saving.value = true
  try {
    await $fetch('/api/seasons/active', {
      method: 'PATCH',
      body: { season_id: event.data.season_id },
    })
    toast.add({ title: 'Success', description: 'Active season updated.', color: 'success' })
    await refresh()
  } catch (e) {
    toast.add({ title: 'Error', description: getErrorMessage(e), color: 'error' })
  } finally {
    saving.value = false
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
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">Active Season</h2>
        </template>

        <UForm :schema="SetActiveSeasonRequest" :state="state" class="space-y-4" @submit="onSubmit">
          <UFormField name="season_id" label="Current Season">
            <USelect v-model="state.season_id" :items="seasonItems" class="w-full" />
          </UFormField>

          <UButton type="submit" :disabled="!canEdit" :loading="saving">
            Save
          </UButton>
        </UForm>
      </UCard>
    </template>
  </UDashboardPanel>
</template>

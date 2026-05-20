<script lang="ts" setup>
definePageMeta({
  layout: 'developers-dashboard'
})

import { CreateApplicationRequest } from '~~/shared/schemas'
import type { FormSubmitEvent } from '@nuxt/ui'

type Schema = typeof CreateApplicationRequest._type

const state = reactive<Partial<Schema>>({
  name: undefined,
  description: undefined,
  microsoft_proxy: false,
})

const toast = useToast()
async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    await $fetch('/api/applications', {
      method: 'POST',
      body: event.data,
    })
    toast.add({ title: 'Success', description: 'Application created.', color: 'success' })
    await navigateTo('/developers/applications')
  } catch (e) {
    toast.add({ title: 'Error', description: getErrorMessage(e), color: 'error' })
  }
}

// elements
const ms_proxy_items = ref([
  { label: 'Yes', value: true },
  { label: 'No', value: false },
])

</script>

<template>

<UDashboardPanel>
    <template #header>
      <UDashboardNavbar>
        <template #title>
            <ULink raw class="hover:underline" to="/developers/applications">Applications</ULink>
            <UIcon name="i-lucide-arrow-right"></UIcon>
            Create
        </template>
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>



    <UForm :schema="CreateApplicationRequest" :state="state" class="w-[600px] space-y-3" @submit="onSubmit">
        <UFormField name="name">
            <template #label>
                Application Name<UIcon name="i-lucide-asterisk" class="text-red-400"></UIcon>
            </template>
            <UInput v-model="state.name" class="w-full" placeholder='e.g. "FreeCodex, Aaron Assistant, ...'/>
        </UFormField>

        <UFormField label="Application Description" name="description">
          <UTextarea :rows="12" v-model="state.description" class="w-full" placeholder="e.g. This App provides free Codex tokens to all users. By hacking into OpenAI's internal database, this application..."/>
        </UFormField>

        <UFormField name="microsoft_proxy" label="Serve as Microsoft Proxy">
          <USelect v-model="state.microsoft_proxy" :items="ms_proxy_items" />
        </UFormField>

        <p class="text-xs text-muted">Selecting "Yes" will tell the OAuth login flow to automatically redirect the user login to Microsoft, instead of giving them an option to choose whether to log in with 
          a teams code or with Microsoft. This option is great for creating applications that does not want to affiliate with basishacks accounts.
        </p>

        <UButton type="submit">
            Create Application
        </UButton>
        <USeparator></USeparator>
        <FormRequiredNotification></FormRequiredNotification>
    </UForm>

    </template>
</UDashboardPanel>

</template>
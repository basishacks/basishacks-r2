<script lang="ts" setup>
definePageMeta({
  layout: 'developers-dashboard'
})

import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const schema = z.object({
  name: z.string("Application name is required").max(64, "Application name cannot exceed 64 characters"),
  description: z.optional(z.string().max(1024, "Application description cannot exceed 1024 characters"))
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: undefined,
  description: undefined
})

const toast = useToast()
async function onSubmit(event: FormSubmitEvent<Schema>) {
  toast.add({ title: 'Success', description: 'The form has been submitted.', color: 'success' })
  console.log(event.data)
}

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



    <UForm :schema="schema" :state="state" class="w-[600px] space-y-1.5" @submit="onSubmit">
        <UFormField name="name">
            <template #label>
                Application Name<UIcon name="i-lucide-asterisk" class="text-red-400"></UIcon>
            </template>
            <UInput v-model="state.name" class="w-full" placeholder='e.g. "FreeCodex, Aaron Assistant, ...'/>
        </UFormField>

        <UFormField label="Application Description" name="description">
          <UTextarea :rows="12" v-model="state.description" class="w-full" placeholder="e.g. This App provides free Codex tokens to all users. By hacking into OpenAI's internal database, this application..."/>
        </UFormField>

        <UButton type="submit">
            Submit
        </UButton>
        <USeparator></USeparator>
        <FormRequiredNotification></FormRequiredNotification>
    </UForm>

    </template>
</UDashboardPanel>

</template>
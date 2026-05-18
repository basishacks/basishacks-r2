<script lang="ts" setup>
definePageMeta({
  layout: 'developers-dashboard'
})

import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const schema = z.object({
  email: z.email('Invalid email'),
  password: z.string('Password is required').min(8, 'Must be at least 8 characters')
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  email: undefined,
  password: undefined
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
        <UFormField name="email">
            <template #label>
                Application Name<UIcon name="i-lucide-asterisk" class="text-red-400"></UIcon>
            </template>
            <UInput v-model="state.email" class="w-full"/>
        </UFormField>

        <UFormField label="Password" name="password">
        <UInput v-model="state.password" type="password" />
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
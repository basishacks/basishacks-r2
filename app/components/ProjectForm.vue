<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { SubmitTeamRequest, UpdateTeamRequest } from '~~/shared/schemas'

const { team: defaultTeam, disabled = false } = defineProps<{
  team: APITeam
  disabled?: boolean
}>()
const emit = defineEmits<{
  dirty: [dirty: boolean]
  refresh: []
}>()

const formRef = useTemplateRef('formRef')

const toast = useToast()

watch(
  () => formRef.value?.dirty,
  (value) => {
    emit('dirty', value ?? true)
  },
  { deep: true }
)

const intent = ref<'save' | 'submit'>('save')

const state = reactive({
  name: '',
  pathway: 'junior' as TeamPathway,
  project: {
    name: '',
    description: '',
    repo_url: '',
    demo_url: '',
  },
})

watch(
  () => defaultTeam,
  (value) => {
    state.name = value.name
    state.pathway = value.pathway || 'junior'
    state.project.name = value.project.name
    state.project.description = value.project.description
    state.project.repo_url = value.project.repo_url || ''
    state.project.demo_url = value.project.demo_url || ''
  },
  { deep: true, immediate: true }
)

async function onSubmit(
  event: FormSubmitEvent<UpdateTeamRequest | SubmitTeamRequest>
) {
  const isSubmit = event.submitter?.id === 'project-submit'
  if (
    isSubmit &&
    !confirm(
      "Are you sure you want to submit your team's project? You cannot make edits afterwards."
    )
  )
    return

  const payload = {
    ...event.data,
    project: {
      ...event.data.project,
      demo_url: event.data.project?.demo_url || null,
      repo_url: event.data.project?.repo_url || null,
    },
  }

  try {
    await withLoadingIndicator(async () => {
      let res: { message: string }
      if (!isSubmit) {
        res = await $fetch(`/api/teams/${defaultTeam.id}`, {
          method: 'PATCH',
          body: payload,
        })
      } else {
        res = await $fetch(`/api/teams/${defaultTeam.id}/submit`, {
          method: 'POST',
          body: payload,
        })
      }
      toast.add({
        color: 'success',
        title: res.message,
      })
    })
    emit('refresh')
  } catch (e) {
    toast.add({
      color: 'error',
      title: 'Failed to update project',
      description: getErrorMessage(e),
    })
  }
}
</script>

<template>
  <UForm
    ref="formRef"
    :state="state"
    :schema="intent === 'save' ? UpdateTeamRequest : SubmitTeamRequest"
    :disabled="disabled"
    class="max-w-[600px] space-y-4 mb-4"
    @submit="onSubmit"
  >
    <UFormField
      name="project.name"
      label="Project name"
      help="Make it sound even cooler!"
    >
      <UInput v-model="state.project.name" class="w-full" />
    </UFormField>

    <UFormField name="project.description" label="Project description">
      <UTextarea
        v-model="state.project.description"
        :rows="10"
        class="w-full"
      />

      <template #help>
        <p>Please include:</p>
        <p>* A brief summary of the project</p>
        <p>* What problem it solves (if any)</p>
        <p>* How to use it</p>
        <p>* Technologies used (optional)</p>
      </template>
    </UFormField>

    <UFormField name="project.demo_url" label="Demo URL">
      <UInput v-model="state.project.demo_url" class="w-full" />

      <template #help>
        This should allow anyone can experience your project. For more
        information, please review the hackathon rules.
      </template>
    </UFormField>

    <UFormField name="project.repo_url" label="Repository URL">
      <UInput v-model="state.project.repo_url" class="w-full" />

      <template #help>
        Your project must be open source on
        <ULink href="https://github.com" target="_blank">GitHub</ULink>
        (preferred) or
        <ULink href="https://gitee.com" target="_blank">Gitee</ULink>.
      </template>
    </UFormField>

    <UFormField name="pathway" label="Pathway">
      <URadioGroup
        v-model="state.pathway"
        :items="[
          { label: 'Junior', value: 'junior' },
          { label: 'Senior', value: 'senior' },
        ]"
      />

      <template #help>
        The junior pathway puts more emphasis on originality and creativity,
        while the senior pathway more on problem-solving and impact. You may
        choose any pathway, regardless of grade level.
      </template>
    </UFormField>

    <div class="flex gap-4">
      <UButton
        id="project-save"
        :disabled="disabled"
        variant="subtle"
        type="submit"
        @click="intent = 'save'"
        >Save</UButton
      >
      <UButton
        id="project-submit"
        :disabled="disabled"
        type="submit"
        @click="intent = 'submit'"
        >Submit</UButton
      >
    </div>
  </UForm>
</template>

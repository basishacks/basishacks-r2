<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import rubrics from '~~/shared/rubric'
import { CreateTeamScoresRequest } from '~~/shared/schemas'

const { team } = defineProps<{
  team: APITeam
}>()
const emit = defineEmits<{
  scored: []
}>()

const toast = useToast()

const state = reactive<CreateTeamScoresRequest>({
  reasoning: '',
  scores: Object.keys(rubrics[team.pathway!]).reduce(
    (obj, key) => ({ ...obj, [key]: 0 }),
    {} as Record<keyof (typeof rubrics)['junior'], 0 | 1 | 2 | 3 | 4 | 5>
  ),
})

async function onSubmit(event: FormSubmitEvent<CreateTeamScoresRequest>) {
  if (
    !confirm(
      'Are you sure you want to submit these scores? You cannot edit them after submission.'
    )
  )
    return

  try {
    await withLoadingIndicator(async () => {
      const res = await $fetch(`/api/teams/${team.id}/scores`, {
        method: 'POST',
        body: event.data,
      })
      toast.add({
        color: 'success',
        title: res.message,
      })
    })
    emit('scored')
  } catch (e) {
    toast.add({
      color: 'error',
      title: 'Failed to score project',
      description: getErrorMessage(e),
    })
  }
}
</script>

<template>
  <UCard variant="subtle" class="mb-4">
    <h2 class="bold text-2xl mb-2">{{ team.project.name }}</h2>
    <p class="mb-2">Team: {{ team.name }} ({{ team.id }})</p>
    <p>Pathway: {{ team.pathway }}</p>
    <pre class="my-4 mx-[2ch] text-wrap">{{ team.project.description }}</pre>
    <div class="flex flex-wrap gap-2">
      <UTooltip :text="team.project.repo_url!">
        <UButton
          variant="subtle"
          icon="i-material-symbols-merge"
          :href="team.project.repo_url!"
          external
          target="_blank"
          >Repo</UButton
        >
      </UTooltip>
      <UTooltip :text="team.project.demo_url!">
        <UButton
          variant="subtle"
          icon="i-material-symbols-play-arrow"
          :href="team.project.demo_url!"
          external
          target="_blank"
          >Demo</UButton
        >
      </UTooltip>
    </div>

    <hr class="text-neutral-500 my-4" />

    <h3 class="bold text-xl mb-2">Your scores</h3>

    <UForm :schema="CreateTeamScoresRequest" :state="state" @submit="onSubmit">
      <ul class="mb-4">
        <li
          v-for="[key, rubric] in (Object.entries(rubrics[team.pathway!]))"
          :key="key"
          class="flex items-center gap-4 mb-2"
        >
          <span class="bold">{{ rubric.abbr }} ({{ rubric.weight }}%)</span>
          <UTooltip :text="rubric.description">
            <UIcon name="i-material-symbols-info-outline" />
          </UTooltip>
          <URadioGroup
            v-model="state.scores[key as keyof typeof state.scores]"
            :items="[0, 1, 2, 3, 4, 5].map((v) => ({ label: `${v}`, value: v as 0|1|2|3|4|5 }))"
            variant="table"
            orientation="horizontal"
          />
        </li>
      </ul>

      <UFormField name="reasoning" label="Score reasoning">
        <UTextarea
          v-model="state.reasoning"
          class="w-full"
          placeholder="Please briefly share your reasoning on this score."
          :rows="5"
        />
      </UFormField>

      <UFormField>
        <UButton class="mt-4" type="submit">Submit scores</UButton>
      </UFormField>
    </UForm>
  </UCard>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { SubmitVoteRequest } from '~~/shared/schemas'

definePageMeta({
  middleware: ['auth'],
})

const toast = useToast()

const { data, error, refresh } = await useFetch<GetBallotResponse>(
  '/api/ballot'
)
if (error.value) {
  throw error.value
}

const state = reactive<SubmitVoteRequest>({
  scores: data.value?.scores ?? [3, 3, 3, 3],
  reasoning: data.value?.reasoning ?? '',
})

const totalStars = computed(() => state.scores.reduce((a, b) => a + b, 0))

function decrement(index: number) {
  state.scores[index]!--
}

function increment(index: number) {
  state.scores[index]!++
}

async function onSubmit(event: FormSubmitEvent<SubmitVoteRequest>) {
  if (
    !confirm(
      'Are you sure you want to submit the vote? You cannot edit them after submission.'
    )
  )
    return

  try {
    await withLoadingIndicator(async () => {
      const res = await $fetch(`/api/ballot`, {
        method: 'PATCH',
        body: event.data,
      })
      await refresh()
      toast.add({
        color: 'success',
        title: res.message,
      })
    })
  } catch (e) {
    toast.add({
      color: 'error',
      title: 'Failed to submit vote',
      description: getErrorMessage(e),
    })
  }
}
</script>

<template>
  <div class="mt-4">
    <h1 class="text-4xl text-primary bold glow mb-4">Peer voting</h1>

    <p class="mb-4">
      You will see four projects below. Please distribute 12 stars among them.
      Each project must receive 1-5 stars, and you must use all of them. Please
      also write a short paragraph justifying your vote. Make sure you include
      details about ALL four projects!
    </p>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <VotingProjectCard
        v-for="project in data?.projects"
        :key="project.id"
        :project="project"
      />
    </div>

    <h2 class="text-2xl mb-4 bold">Submit vote</h2>

    <UForm
      :disabled="!!data?.scores"
      :state="state"
      :schema="SubmitVoteRequest"
      @submit="onSubmit"
    >
      <UCard variant="subtle">
        <p v-if="!!data?.scores" class="mb-4 bold">
          You have voted already. Thank you!
        </p>

        <p class="flex items-center gap-2 mb-4">
          Total stars:
          <UIcon
            name="i-material-symbols-star-rate"
            size="1.2em"
            class="text-yellow-300"
          />
          {{ totalStars }} / 12
        </p>

        <UFormField name="scores">
          <div
            class="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 items-center mb-4"
          >
            <template
              v-for="(project, index) in data?.projects"
              :key="project.id"
            >
              <span>{{ project.name }}</span>
              <div class="flex items-center gap-4">
                <UButton
                  v-if="!data?.scores"
                  icon="i-material-symbols-stat-minus-1"
                  :disabled=" state.scores[index]! <= 1"
                  @click="decrement(index)"
                />
                <UIcon
                  name="i-material-symbols-star-rate"
                  size="1.2em"
                  class="text-yellow-300"
                />
                <span>{{ state.scores[index] }} / 5</span>
                <UButton
                  v-if="!data?.scores"
                  icon="i-material-symbols-stat-1"
                  :disabled="state.scores[index]! >= 5 || totalStars >= 12"
                  @click="increment(index)"
                />
              </div>
            </template>
          </div>
        </UFormField>

        <UFormField name="reasoning" label="Your reasoning" class="mb-4">
          <UTextarea
            v-model="state.reasoning"
            placeholder="Please explain your reasoning, making sure to include details about every project!"
            class="w-full"
            :rows="5"
          />
        </UFormField>

        <UFormField v-if="!data?.scores">
          <UButton :disabled="totalStars !== 12" type="submit">Submit</UButton>
        </UFormField>
      </UCard>
    </UForm>
  </div>
</template>

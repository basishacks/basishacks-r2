@ -1,336 +0,0 @@
<script setup lang="ts">
import type { ButtonProps } from '@nuxt/ui'

definePageMeta({
    layout: 'dashboard',
  middleware: ['auth'],
})

useHead({
  title: `General | ${WEBSITE_NAME}`,
})

const { user: userRef } = useUserSession()
const user = computed(() => userRef.value!)

const { data: hackathon, error: hackathonError } =
  await useFetch('/api/hackathon')
if (hackathonError.value) {
  throw hackathonError.value
}

const { data, error, refresh } = await useFetch<GetUserResponse>(
  () => `/api/users/${user.value.id}`,
)
if (error.value) {
  throw error.value
}


const isDirty = ref(false)

async function refreshData() {
  await withLoadingIndicator(async () => {
    await refresh()
  })
  isDirty.value = false
}

function dateUpdated(dirty: boolean) {
  isDirty.value = dirty
}

onBeforeRouteLeave(() => {
  if (
    isDirty.value &&
    !confirm('You have unsaved changes. Are you sure you want to leave?')
  ) {
    return abortNavigation()
  }
})

function beforeUnload(event: BeforeUnloadEvent) {
  if (isDirty.value) {
    event.preventDefault()
    event.returnValue = true
  }
}

watch(isDirty, (value) => {
  if (value) {
    window.addEventListener('beforeunload', beforeUnload)
  } else {
    window.removeEventListener('beforeunload', beforeUnload)
  }
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', beforeUnload)
})


const links = ref<ButtonProps[]>([
  {
    label: 'Check Schedule',
    color: 'neutral',
    variant: 'subtle',
    trailingIcon: 'i-lucide-arrow-right',
    href: "/"
  }
])

const links_noteam = ref<ButtonProps[]>([
  {
    label: 'Create Team',
    color: 'neutral',
    variant: 'subtle',
    trailingIcon: 'i-lucide-arrow-right',
    href: "/dashboard/teams"
  }
])

</script>

<template>

  <div class="mt-12"></div>

    <div v-if="data?.team == null && hackathon?.status !== 'not_started'" class="mx-auto">
        <UPageCTA class="mx-32"
            :links="links_noteam"
            title="You don't have a team yet!"
            description="You need to create a team before you can edit your project! Well... you can still create a solo team if you want to work alone :)"
        />
      </div>

    <div v-else-if="hackathon?.status !== 'not_started'">

        <h2 class="text-3xl bold mb-4">General</h2>

          

        <p v-if="data?.team?.project.submitted" class="mb-4 glow">
          You have submitted your project. Congratulations! 🎉
        </p>
        <p v-else-if="hackathon?.status !== 'in_progress'" class="mb-4">
          The submission period is over, and you can no longer submit your
          project.
        </p>
        <ProjectForm
          :team="data?.team"
          :disabled="
            hackathon?.status !== 'in_progress' || data?.team?.project.submitted
          "
          @dirty="dateUpdated"
          @refresh="refreshData"
        />
      </div>

      

      <div v-else="hackathon?.status == 'not_started'" class="mx-auto">
        <UPageCTA class="mx-32"
        :links="links"
    title="Hackathon not started yet!"
    description="Stay tuned for news and check out the schedule!"
  />
      </div>
</template>


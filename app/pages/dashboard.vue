<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
})

useHead({
  title: `Dashboard | ${WEBSITE_NAME}`,
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
const confettiTriggered = ref(false)



const rankColorClass = computed(() => {
  const rank = data.value?.team?.rank
  if (rank === 1) return 'text-yellow-400'
  if (rank === 2) return 'text-gray-300'
  if (rank === 3) return 'text-orange-600'
  return 'text-white'
})

function triggerConfetti() {
  const rank = data.value?.team?.rank
  if (!rank || rank > 3 || confettiTriggered.value) return

  confettiTriggered.value = true

  import('canvas-confetti').then((confettiModule) => {

    // if (sessionStorage.getItem('confettiShown')) {
    //   return
    // }


    const confetti = (config: any) => {


      sessionStorage.setItem('confettiShown', 'true'); // Set a flag in session storage to indicate confetti has been shown

      confettiModule.default({
        ...config
      })
    }

    const origin = { x: 0.36, y: 0.42 } // Sorry i hard coded this because its just easier to tweak the position that way

    // Different confetti effects based on rank
    if (rank === 1) {
      // Gold confetti for 1st place
      confetti({
        particleCount: 200,
        spread: 70,
        origin: origin,
        colors: ['#FFD700', '#FFA500', '#FFFF00'],
      })
    } else if (rank === 2) {
      // Silver confetti for 2nd place
      confetti({
        particleCount: 150,
        spread: 60,
        origin: origin,
        colors: ['#C0C0C0', '#E8E8E8', '#D3D3D3'],
      })
    } else if (rank === 3) {
      // Bronze confetti for 3rd place
      confetti({
        particleCount: 120,
        spread: 55,
        origin: origin,
        colors: ['#CD7F32', '#B87333', '#A0522D'],
      })
    } else if (rank >= 10) {
        confetti({
          particleCount: 120,
          spread: 55,
          origin: origin,
          colors: [""],
        })
    }
  })
}

onMounted(() => {
  triggerConfetti()
})

watch(
  () => data.value?.team?.rank,
  (newRank) => {
    if (newRank && newRank <= 3 && !confettiTriggered.value) {
      triggerConfetti()
    }
  }
)

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
</script>

<template>
  <div>
    <h1 class="text-4xl text-primary bold glow mb-4">Dashboard</h1>

    <div v-if="!data?.team">
      <p class="mb-4">
        Welcome <span class="bold">{{ data!.name || data!.email }}</span
        >! You don't have a team yet. You can
        <ULink href="/teams/new">create a team</ULink> or ask a member from
        another team to add you!
      </p>
      <p v-if="hackathon?.status === 'not_started'" class="mb-4">
        (Don't worry though, you can also create or join a team during the
        hackathon :)
      </p>
    </div>

    <template v-else>
      <p class="mb-4">
        Welcome <span class="bold">{{ data.name || data.email }}</span
        >!
        <template v-if="hackathon?.status === 'not_started'">
          The hackathon hasn't started yet - please check the timer on the home
          page!
        </template>
        <template v-else-if="hackathon?.status === 'in_progress'">
          The hackathon is in progress - <span class="glow">HACK AWAY!</span>
        </template>
        <template v-else-if="hackathon?.status === 'voting'">
          The hackathon is completed, and judging and peer voting is underway!
        </template>
        <template v-else-if="hackathon?.status === 'finished'">
          The hackathon is completed, and the scores are released!
        </template>
        <template v-else-if="hackathon?.status === 'paused'">
          The hackathon is paused as the organizers figure out the secrets of
          the universe... Please check back later!
        </template>
      </p>
      <p class="mb-4">
        Please review the <ULink href="/rules">rules page</ULink> for the most
        up-to-date rules and requirements.
      </p>

      <div class="mb-4">
        <TeamForm
          :team="data.team"
          :disabled="
            (hackathon?.status !== 'in_progress' &&
              hackathon?.status !== 'not_started') ||
            data.team.project.submitted
          "
          @refresh="refreshData"
        />
      </div>

      <template v-if="hackathon?.status !== 'not_started'">

        <h2 class="text-3xl bold mb-4">Your project</h2>

        <div v-if="data.team.rank" class="mb-4 max-w-[600px] border border-gray-200 dark:border-gray-800 rounded-lg p-6 bg-white dark:bg-gray-900">
          <div class="flex items-center gap-8">
            <!-- Score Section -->
            <div class="flex-1">
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Your Score</p>
              <div class="flex items-baseline gap-1">
                <span class="text-6xl font-bold text-gray-900 dark:text-white">{{ data.team.score }}</span>
                <span class="text-xl text-gray-500 dark:text-gray-400">/100</span>
              </div>
            </div>

            <!-- Divider -->
            <div class="w-0.5 h-24 bg-gray-300 dark:bg-gray-600"></div>

            <!-- Rank Section -->
            <div class="flex-1">
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Your Rank</p>
              <div class="text-6xl font-bold" :class="rankColorClass">
                #{{ data.team.rank }}
              </div>
            </div>
          </div>

          <ULink href="/results" class="mt-4 inline-block text-sm text-primary hover:underline" >See full results and feedback</ULink>
        </div>  

        <p v-else-if="data.team.project.submitted" class="mb-4 glow">
          You have submitted your project. Congratulations! 🎉
        </p>
        <p v-else-if="hackathon?.status !== 'in_progress'" class="mb-4">
          The submission period is over, and you can no longer submit your
          project.
        </p>
        <ProjectForm
          :team="data.team"
          :disabled="
            hackathon?.status !== 'in_progress' || data.team.project.submitted
          "
          @dirty="dateUpdated"
          @refresh="refreshData"
        />
      </template>
    </template>
  </div>
</template>

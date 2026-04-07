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
  if (rank == 1) return 'text-yellow-400'
  if (rank == 2) return 'text-gray-300'
  if (rank == 3) return 'text-orange-600'
  return 'text-ui-text'
})

const rankMetallicClass = computed(() => {
  const rank = data.value?.team?.rank
  if (rank == 1) return 'metallic-gold'
  if (rank == 2) return 'metallic-silver'
  if (rank == 3) return 'metallic-bronze'
  return ''
})

function confettiPride(confetti: any, color: Array<string>) {
var end = Date.now() + (1 * 1000);
(function frame() {
  confetti({
    particleCount: 3,
    angle: 60,
    spread: 55,
    origin: { x: 0, y:1},
    colors: color
  });
  confetti({
    particleCount: 3,
    angle: 120,
    spread: 55,
    origin: { x: 1, y:1},
    colors: color
  });

  if (Date.now() < end) {
    requestAnimationFrame(frame);
  }
}());
}

function confettiFireworks(confetti: any, color: Array<string>) {
  var duration = 3 * 1000;
var animationEnd = Date.now() + duration;
var defaults = { startVelocity: 20, spread: 360, ticks: 60, zIndex: 0, colors: color };

function randomInRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

var interval = setInterval(function() {
  var timeLeft = animationEnd - Date.now();

  if (timeLeft <= 0) {
    return clearInterval(interval);
  }

  var particleCount = 100;
  // since particles fall down, start a bit higher than random
  confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.9), y: randomInRange(0.2, 0.9)} });
  //confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
}, 500);
}

function triggerConfetti(force: boolean = false) {
  const rank = data.value?.team?.rank
  if (!rank || rank > 10 || confettiTriggered.value) return

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

    


// go Buckeyes!



     

    if (rank === 1) {
      confettiPride(confetti, ['#FFD700', '#FFA500', '#FFFF00'])
      confettiFireworks(confetti, ['#FFD700', '#FFA500', '#FFFF00'])
    } else if (rank === 2) {
      confettiPride(confetti, ['#C0C0C0', '#E8E8E8', '#D3D3D3'])
      confettiFireworks(confetti, ['#C0C0C0', '#E8E8E8', '#D3D3D3'])
    } else if (rank === 3) {
      confettiPride(confetti, ['#CD7F32', '#B87333', '#A0522D'])
      confettiFireworks(confetti, ['#CD7F32', '#B87333', '#A0522D'])
    } else if (rank <= 10){
      confettiPride(confetti, ["#FF0000", "#00FF00", "#0000FF"])
    }
  })
}

onMounted(() => {
  triggerConfetti()
})

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
  <div class="mt-4">
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

          <p class="mb-2"><strong>April 2026</strong><span style="color:var(--ui-text-muted)"> - </span>Cyberpunk</p>

          <div class="flex items-center gap-8">
            <!-- Score Section -->
            <div class="flex-1">
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Overall Rating</p>
              <div class="flex items-baseline gap-1">
                <span class="text-6xl font-bold text-gray-900 dark:text-white">{{ data.team.score }}</span>
                <span class="text-xl text-gray-500 dark:text-gray-400">/100</span>
              </div>
            </div>

            <!-- Divider -->
            <div class="w-0.5 h-24 bg-gray-300 dark:bg-gray-600"></div>

            <!-- Rank Section -->
            <div class="flex-1">
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Ranking</p>
              <div class="text-6xl font-bold" :class="[rankColorClass, rankMetallicClass]">
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

<style scoped>
@keyframes shimmer {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.metallic-gold {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 25%, #FFD700 50%, #FFA500 75%, #FFD700 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
  animation: shimmer 3s ease-in-out infinite;
}

.metallic-silver {
  background: linear-gradient(135deg, #E8E8E8 0%, #C0C0C0 25%, #E8E8E8 50%, #C0C0C0 75%, #E8E8E8 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
  animation: shimmer 3s ease-in-out infinite;
}

.metallic-bronze {
  background: linear-gradient(135deg, #CD7F32 0%, #B87333 25%, #df9953 50%, #B87333 75%, #CD7F32 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
  animation: shimmer 3s ease-in-out infinite;
}
</style>

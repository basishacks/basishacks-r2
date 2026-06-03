<script setup lang="ts">
import JudgeProgressCard from '~/components/JudgeProgressCard.vue'
import { hasPermission } from '~~/shared/permissions'

definePageMeta({
  middleware: ['auth'],
})

const { user: userRef } = useUserSession()
const userID = computed(() => userRef.value?.id ?? 0)

const { data: hackathon } = await useFetch('/api/seasons/active')
if (hackathon.value?.status !== 'voting') {
  throw await navigateTo('/')
}

const { data: userData, error: userError } = await useFetch<GetUserResponse>(
  () => `/api/users/${userID.value}`,
)
if (userError.value) {
  throw userError.value
}
if (!hasPermission(userData.value?.role, 'admin') && !hasPermission(userData.value?.role, 'judge')) {
  throw await navigateTo('/')
}

const { data, error, refresh } = await useFetch<APITeam[]>(
  '/api/teams?judging=1',
)
if (error.value) {
  throw error.value
}

const { data: summary, refresh: refreshSummary } = await useFetch<GetBallotSummaryResponse>(
  '/api/ballot/summary'
)

const currentSummary = computed(() => summary.value?.current ?? null)

const filteredPast = computed(() => summary.value?.past.filter(item => item.ballot_count > 0) ?? [])

async function onScored() {
  await withLoadingIndicator(async () => {
    await refresh()
    await refreshSummary()
  })
}

async function continueJudging() {
  await navigateTo('/judging/continue')
}
</script>

  <template>
    <div class="mt-4">
      <h1 class="text-4xl text-primary bold glow mb-4">Judging</h1>
      <p>Thank you for your participation in judging!</p>
      <br>
      <p>
        A total of 
        <span class="bold">66</span>
        teams logged in during the timespan of the event.
      </p>
      <p>
        Among them, 
        <span class="bold">40</span>
        teams sucessfully submitted their projects.
      </p>
      <br>
       <p>
        <span class="bold">22</span>
        of the teams participated in the 
        <UBadge
            variant="outline"
            color="primary"
            >Junior</UBadge>
        division, 
        <span class="bold">18</span>
        participated in the
        <UBadge
            variant="outline"
            color="warning"
            >Senior</UBadge>
        division.
      </p>
    </div>
    <USeparator class="my-4"></USeparator>
    <h3 class="text-3xl bold">Current Evaluations</h3>
    <div v-if="currentSummary" class="my-4">
      <JudgeProgressCard :season="currentSummary" />
    </div>
    <p v-else class="text-muted text-sm my-4">No current evaluations available.</p>

    <UButton @click="continueJudging">Continue</UButton>
    
    <USeparator class="my-4"></USeparator>

    <h3 class="text-3xl bold">Past Evaluations</h3>
    <div v-if="filteredPast && filteredPast.length > 0" class="my-4" v-for="item in filteredPast" :key="item.season_id">
      <JudgeProgressCard :season="item" />
    </div>
    <p v-else class="text-muted text-sm my-4">No participated evaluations available.</p>
    <UAlert
    color="neutral"
    icon="i-lucide-info"
    class="my-4"
    variant="subtle">
      <template #title>
        <span class="font-bold">Regarding Past Evaluations</span>
      </template>
      <template #description>
        <p>If you participated in any past evaluations, they will be available here once they are migrated.</p>
      </template>
    </UAlert>
  </template>

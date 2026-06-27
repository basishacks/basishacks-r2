<template>

<UCard class="min-w-[600px]">
    <template #default>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col">
          <span class="text-sm font-bold text-muted">{{ seasonDate }}</span>
          <div class="flex flex-row gap-2">
            <span class="">{{ seasonName }}</span>
            <UBadge
            variant="outline"
            :color="team.pathway == 'junior' ? 'primary' : 'warning'"
            >{{ team.pathway == 'junior' ? 'Junior' : 'Senior' }}</UBadge>
          </div>
        </div>
        <div v-if="team.score" class="w-full flex flex-row justify-between items-center">
          <div class="w-1/2">
            <span class="uppercase text-sm text-muted">score</span>
            <div class="w-1/2 flex items-baseline-last gap-1">
              <span class="text-5xl font-bold" :class="{ 'rainbow-once': loaded && team.score == 800 }">{{ team.score }}</span>
              <span class="text-muted">/800</span>
            </div>
          </div>
          <div class="w-1/2">
            <span class="uppercase text-sm text-muted">ranking</span>
            <div class="flex items-baseline-last gap-1">
              <span
                class="text-5xl font-bold"
                :class="{
                  'metallic-gold': team.rank == 1,
                  'metallic-silver': team.rank == 2,
                  'metallic-bronze': team.rank == 3,
                }"
              >#{{ team.rank }}</span>
            </div>
          </div>
        </div>
        <div v-else class="relative w-full flex flex-row justify-between items-center">
          <div class="absolute inset-0 z-10 flex flex-row items-center justify-center">
            <div class="flex flex-row items-center gap-2 rounded-lg bg-background/80 px-4 py-2 shadow-sm backdrop-blur-sm text-muted">
              <UIcon name="i-lucide-x"></UIcon>
              <span>Project not submitted</span>
            </div>
          </div>
          <div class="w-1/2 blur-md select-none">
            <span class="uppercase text-sm text-muted">score</span>
            <div class="w-1/2 flex items-baseline-last gap-1">
              <span class="text-5xl font-bold">SOO</span>
              <span class="text-muted">/800</span>
            </div>
          </div>
          <div class="w-1/2 blur-md select-none">
            <span class="uppercase text-sm text-muted">ranking</span>
            <div class="flex items-baseline-last gap-1">
              <span class="text-5xl font-bold">#SAD</span>
            </div>
          </div>
        </div>
        <div class="flex flex-col">
          <div class="flex flex-row gap-2">
            <span class="text-sm text-muted">Team</span>
            <span class="text-sm">{{ team.name }}</span>
          </div>
          <UserAvatarGroup v-if="members && members.length > 0" :users="members" :max="5" size="md" class="mt-2"/>
          <p v-else class="text-muted text-sm">(No members...? For some reason)</p>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex flex-col gap-2">
        <UModal :title="team.name">
        <UButton variant="link" class="p-0 h-auto text-xs">
          <UIcon name="i-lucide-file" class="text-xs"></UIcon>
          See Project Details
        </UButton>
        <template #body>
          <ProjectCard :id="team.id" />
        </template>
      </UModal>
      <ULink class="text-xs" :href="hackathonSeasons[team.season_id!]?.docs || '#'" target="_blank" external>
        <UIcon name="i-lucide-calendar" class="text-xs"></UIcon>
        See Season Details
        <UIcon name="i-lucide-arrow-right" class="text-xs"></UIcon>
      </ULink>
      </div>
    </template>
</UCard>

</template>

<script setup lang="ts">

import hackathonSeasons from '~~/shared/seasons'

const props = defineProps<{
  team: GetTeamResponse
}>()

const seasonDate = computed(() => {
  if (!props.team.season_id) return "Unknown Date"
  return hackathonSeasons[props.team.season_id]?.date || "Unknown Date"
})

const seasonName = computed(() => {
  if (!props.team.season_id) return "Unknown Name"
  return hackathonSeasons[props.team.season_id]?.theme_name || "Unknown Name"
})

const { data: members } = await useFetch<GetTeamMembersResponse>(
  () => `/api/teams/${props.team.id}/users`
)

const loaded = ref(false)
onMounted(() => {
  setTimeout(() => {
    loaded.value = true
  }, 500)
})

</script>

<style scoped>
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

@keyframes shimmer {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 50% 100%;
  }
  100% {
    background-position: 0% 50%;
  }
}


.rainbow-once {
  background: linear-gradient(
    to right,
    var(--ui-text) 0%,
    var(--ui-text) 25%,
    #ff2a2a 30%,
    #ff7a00 35%,
    #ffea00 40%,
    #05c443 45%,
    #00bfff 50%,
    #8a2be2 60%,
    var(--ui-text) 70%,
    var(--ui-text) 100%
  );
  
  background-size: 400% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  
  animation: rainbow-sweep 2s ease-in-out 1 forwards;
}

@keyframes rainbow-sweep {
  0% {
    background-position: 0% center;
  }
  100% {
    background-position: 100% center;
  }
}
</style>
<script setup lang="ts">
const props = defineProps<{
  team: GetTeamResponse
}>()

const emit = defineEmits<{
  click: []
}>()

const { data: members } = await useFetch<GetTeamMembersResponse>(
  () => `/api/teams/${props.team.id}/users`
)
</script>

<template>
  <div
    class="w-96 mx-4 p-6 rounded-2xl border border-muted hover:border-primary hover:bg-muted transition-colors cursor-pointer flex-shrink-0 select-none"
    @click="emit('click')"
  >
    <div class="flex items-center justify-between mb-3">
      <div class="flex flex-row items-center gap-2">
        <div>
          <span
            v-if="team.rank"
            class="text-3xl font-bold"
            :class="{
              'metallic-gold': team.rank === 1,
              'metallic-silver': team.rank === 2,
              'metallic-bronze': team.rank === 3,
              'text-neutral-500': team.rank > 3
            }"
          >
            #{{ team.rank }}
          </span>
          <span v-else class="text-lg">Unranked</span>
        </div>
      <div class="flex flex-row gap-2">
        <div v-for="award in team.awards" class="flex flex-row gap-2">
            <AwardButton :award="award" size="sm"></AwardButton>
        </div>
      </div>
      </div>
      <UBadge
        v-if="team.pathway"
        variant="outline"
        size="sm"
        :color="team.pathway === 'junior' ? 'primary' : 'warning'"
      >
        {{ team.pathway === 'junior' ? 'Junior' : 'Senior' }}
      </UBadge>
    </div>
    <h4 class="text-xl font-bold truncate">{{ team.project?.name || '(No Project Name)' }}</h4>
    <p class="text-sm truncate mt-1">{{ team.project?.description || '(No Project Description)' }}</p>
    <UserAvatarGroup
      v-if="members && members.length > 0"
      :users="members"
      :max="5"
      size="sm"
      class="mt-3"
    />
    <p v-else class="text-muted text-sm mt-3">(No members)</p>
  </div>
</template>

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
</style>

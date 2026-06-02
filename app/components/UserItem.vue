<script setup lang="ts">
defineProps<{
  user: {
    name?: string | null
    email?: string
    profile_picture?: string | null
  } | null | undefined
  size?: '3xs' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
}>()
</script>

<template>
  <UserAvatar :user="user" :size="size ?? 'md'" />
  <div class="min-w-0">
    <p class="text-sm font-medium truncate">
      {{ user?.name || user?.email || 'Unknown' }}
    </p>
    <p v-if="user?.email" class="text-xs text-muted truncate">
      {{ user.email }}
    </p>
  </div>
</template>

<template>
  <UPopover mode="hover" @update:open="handleHover">
    <slot />

    <template #content>
      <div class="flex items-center gap-3 p-3 min-w-[200px]">
        <template v-if="pending">
          <USkeleton class="w-10 h-10 rounded-full shrink-0" />
          <div class="space-y-1.5 flex-1">
            <USkeleton class="w-24 h-4 rounded" />
            <USkeleton class="w-16 h-3 rounded" />
          </div>
        </template>

        <template v-else-if="hoveredUser">
          <UserAvatar :user="hoveredUser" size="md" />
          <div class="min-w-0">
            <p class="text-sm font-medium truncate">
              {{ hoveredUser.name || hoveredUser.email }}
            </p>
            <p class="text-xs text-muted truncate">
              {{ hoveredUser.email }}
            </p>
          </div>
        </template>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
const props = defineProps<{
  user: number | APIUser
}>()

const hasHovered = ref(false)
const hoveredUser = ref<APIUser | null>(null)
const pending = ref(false)

const handleHover = async (isOpen: boolean) => {
  if (!isOpen || hasHovered.value) return
  hasHovered.value = true

  pending.value = true
  try {
    if (typeof props.user === 'number') {
      hoveredUser.value = await $fetch<APIUser>(`/api/users/${props.user}`)
    } else {
      hoveredUser.value = props.user
    }
  } catch (e) {
    console.error('Failed to fetch user:', e)
  } finally {
    pending.value = false
  }
}
</script>

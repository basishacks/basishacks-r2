

<template>
  <div>
    <RoleHeader :class="{ relative: !stickyHeader }"/>

    <UMain>
      <slot />
    </UMain>

    <Footer/>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  stickyHeader?: boolean
}>()
</script>

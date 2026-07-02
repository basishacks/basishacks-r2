<script setup lang="ts">
interface Props {
  summary: string
}

defineProps<Props>()
</script>

<template>
  <details class="vp-collapsible">
    <summary>{{ summary }}</summary>
    <div class="vp-collapsible-content">
      <slot />
    </div>
  </details>
</template>

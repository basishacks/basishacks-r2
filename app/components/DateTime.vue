<script setup lang="ts">
const { date } = defineProps<{
  date: Date
}>()

const text = computed(() =>
  date.toLocaleString('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Shanghai',
  })
)
</script>

<template>
  <time :datetime="date.toISOString()">
    <ClientOnly>{{ text }}</ClientOnly>
  </time>
</template>

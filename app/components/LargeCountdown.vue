<script setup lang="ts">
const { date } = defineProps<{
  date: Date
  label: string
}>()

const delta = ref(0)

const days = computed(() => Math.floor(delta.value / 1000 / 60 / 60 / 24))
const hours = computed(() => Math.floor(delta.value / 1000 / 60 / 60) % 24)
const minutes = computed(() => Math.floor(delta.value / 1000 / 60) % 60)
const seconds = computed(() => Math.floor(delta.value / 1000) % 60)

function formatSegment(num: number) {
  return num.toString().padStart(2, '0')
}

let intervalId: ReturnType<typeof setInterval> | null = null

function updateTime() {
  delta.value = Math.max(0, date.getTime() - Date.now())
}

onMounted(() => {
  updateTime()
  intervalId = setInterval(() => {
    updateTime()
  }, 1000)
})

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId)
  }
})
</script>

<template>
  <div
    class="border-4 border-primary px-5 sm:px-10 py-5 border-dashed text-center flex flex-col gap-5 items-center"
  >
    <p class="bold">{{ label }}</p>
    <div
      class="flex flex-row justify-around text-5xl sm:text-6xl items-center bold gap-1"
    >
      <span class="text-primary">{{ formatSegment(days) }}</span>
      <span class="text-2xl sm:text-3xl">:</span>
      <span class="text-primary">{{ formatSegment(hours) }}</span>
      <span class="text-2xl sm:text-3xl">:</span>
      <span class="text-primary">{{ formatSegment(minutes) }}</span>
      <span class="text-2xl sm:text-3xl">:</span>
      <span class="text-primary">{{ formatSegment(seconds) }}</span>
    </div>
    <p class="bold"><DateTime :date="date" /></p>
  </div>
</template>

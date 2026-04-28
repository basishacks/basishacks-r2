<template>
    <canvas class="fixed inset-0 -z-10 w-full h-full" ref="canvas"></canvas>
    <div class="flex flex-col items-center justify-center min-h-screen">
        <div class="rounded-md bg-[var(--ui-bg)] w-full max-w-md p-8 text-center">
            <p class="text-xl bold glow text-primary">{{ WEBSITE_NAME }}</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const canvas = ref<HTMLCanvasElement | null>(null)
let animationFrameId = 0
let drops: Array<number> = []
let fontSize = 18
let columnCount = 0
let width = 0
let height = 0
let ctx: CanvasRenderingContext2D | null = null

const matrixCharacters = '01ABCDEFGHIJKLMNOPQRSTUVWXYZｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ'

function setupCanvas() {
  if (!canvas.value) return

  const devicePixelRatio = window.devicePixelRatio || 1
  width = window.innerWidth
  height = window.innerHeight
  const scaledWidth = width * devicePixelRatio
  const scaledHeight = height * devicePixelRatio

  canvas.value.width = scaledWidth
  canvas.value.height = scaledHeight
  canvas.value.style.width = `${width}px`
  canvas.value.style.height = `${height}px`

  ctx = canvas.value.getContext('2d')
  if (!ctx) return

  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
  ctx.font = `${fontSize}px monospace`
  columnCount = Math.floor(width / fontSize)
  drops = Array.from({ length: columnCount }, () => Math.floor(Math.random() * height / fontSize))

  ctx.fillStyle = 'rgba(0, 0, 0, 1)'
  ctx.fillRect(0, 0, width, height)
}

function drawMatrix() {
  if (!ctx) return

  

  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#05df72'
  ctx.textBaseline = 'top'

  for (let i = 0; i < columnCount; i += 1) {

   

    const text = matrixCharacters.charAt(Math.floor(Math.random() * matrixCharacters.length))
    const x = i * fontSize
    // @ts-ignore fuck you ts
    const y = drops[i] * fontSize;

    ctx.fillText(text, x, y)

    if (y > height && Math.random() > 0.975) {
      drops[i] = 0
    }
    // @ts-ignore fuck you ts
    drops[i] += 1
  }
}

function animate() {
  drawMatrix()
}

function handleResize() {
  setupCanvas()
}

onMounted(() => {
  setupCanvas()
  setInterval(() => {animate()}, 33)
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.cancelAnimationFrame(animationFrameId)
  window.removeEventListener('resize', handleResize)
})

definePageMeta({
  title: `OAuth2 Authorization | ${WEBSITE_NAME}`,
  layout: false
})
</script>
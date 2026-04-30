<template>
  <div class="w-full h-full -z-15">
    <canvas class="fixed inset-0 -z-10 w-full h-full" ref="canvas"></canvas>
    <div class="flex flex-col items-center justify-center min-h-screen">
        <div class="rounded-md bg-default w-full max-w-md px-8 text-center">
            <p class="text-xl bold glow text-primary my-8">{{ WEBSITE_NAME }}</p>
            <USeparator></USeparator>
            <div class="w-full h-100 flex flex-row justify-center items-center">

              <Transition name="fade">
                <LoaderAnimationInline v-if="showLoading"></LoaderAnimationInline>
              </Transition>

              <Transition name="fade">
                <div v-if="status == 'error'">
                  <UIcon name="i-material-symbols-error-rounded" class="w-8 h-8 text-red-400"></UIcon>
                  <h3 class="text-sm text-red-400">There was a problem during your login</h3>
                  <p class="mt-4 text-sm">{{ error_description }}</p>
                </div>
              </Transition>

            </div>
        </div>
        
    </div>
  </div>
    
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const showLoading = ref(true)
const status = ref('load')
const error_description = ref('')
const error = ref('')

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

//////////




const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fade() {
  showLoading.value = false
  await delay(600)
}

async function loginFlowCheck() {

  const route = useRoute()

  const client_id = route.query.client_id;
  const response_type = route.query.response_type;
  const scope = route.query.scope;
  const state = route.query.state;
  const code_challenge = route.query.code_challenge;
  const code_challenge_method = route.query.code_challenge_method;
  const redirect_uri = route.query.redirect_uri;

  // if(!(client_id && response_type && scope && redirect_uri)) {
  //   await fade();
  //   status.value = 'error'
  //   error.value = "invalid_request"
  //   error_description.value = "Missing one of more of the following parameters: 'client_id', 'response_type', 'scope', 'redirect_uri'"
    
  // }

  
  if (client_id) {
    const res1: any = await fetch("/api/oauth2/application?client_id=" + client_id + "&scope=" + scope)
    const js = await res1.json()

    if (res1.status != 200) {
      await fade();
      status.value = 'error'
      error.value = "invalid_request"
      error_description.value = js.message
    }
  }
  
  
}

onMounted(async () => {
  setupCanvas()
  setInterval(() => {animate()}, 33)
  window.addEventListener('resize', handleResize)
  
  
  await loginFlowCheck()
  
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

<style scoped>

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
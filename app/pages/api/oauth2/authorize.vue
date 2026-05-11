<template>
  <div class="w-full h-full -z-15">
    <canvas class="fixed inset-0 -z-10 w-full h-full bg-black" ref="canvas"></canvas>
    <div class="flex flex-col items-center justify-center min-h-screen">
        <div class="rounded-md bg-default w-full max-w-md px-8 text-center">
            <p class="text-xl bold glow text-primary my-8">{{ WEBSITE_NAME }}</p>
            <USeparator></USeparator>
            <div class="w-full h-80 flex flex-row justify-center items-start my-8">

              <Transition name="fade">
                <LoaderAnimationInline v-if="showLoading" class="my-auto"></LoaderAnimationInline>
              </Transition>

              <Transition name="fade">
                <div v-if="status == 'error'" class="my-auto">
                  <UIcon name="i-material-symbols-error-rounded" class="w-8 h-8 text-red-400"></UIcon>
                  <h3 class="text-sm text-red-400">There was a problem during your login</h3>
                  <p class="mt-4 text-sm">{{ error_description }}</p>
                </div>
              </Transition>

              <Transition name="fade">

                <div class="w-full flex flex-col gap-4 items-start justify-start" v-if="status == 'login'">

                  <h3 class="text-xl bold">Sign in</h3>
                  <UForm
                    :state="state"
                    :schema="SendCodeRequest"
                    class="flex flex-col w-full items-start gap-4 text-left"
                    @submit="onSendCodeSubmit"
                    
                  >
                    <UFormField name="email" label="via your School Email" class="w-full">
                      <UInput v-model="state.email" type="email" class="w-full" />
                    </UFormField>

                    <UButton :disabled="isLoading" type="submit"
                      >Send verification code</UButton
                    >
                  </UForm>

                  <USeparator class="w-full"></USeparator>

                  <UForm class="w-full flex flex-col items-start gap-4 text-left">
                    

                      <UFormField name="email" label="or use the following...">
                        <UButton @click="navigateToOAuth2" :disabled="isLoading"> 
                          <img src="/assets/Microsoft_logo.svg" alt="Microsoft Logo" class="w-5 h-5 mr-2" />
                          Login with Microsoft
                        </UButton>
                      </UFormField>
                  </UForm>
                </div>
              </Transition>

              <Transition name="fade">
                <div v-if="status == 'code_sent'" class="w-full flex flex-col gap-4 items-start justify-start">
                  
                  <UForm
                    :state="stateLogin"
                    :schema="LoginRequest"
                    class="flex flex-col w-full items-start gap-4 text-left"
                    @submit="onSendCodeLoginSubmit"
                    
                  >
                    <h3 class="text-xl bold">Enter a code...</h3>
                    <span class="text-sm">A <span class="text-primary bold">6-digit</span> verification code has been sent to your 
                      <ULink class="text-primary bold inline" href="https://teams.microsoft.com" target="_blank">
                        Teams Chat
                        <UIcon name="i-material-symbols-link-2" class="w-4 h-4"></UIcon>
                      </ULink>
                      
                       (not email).</span>
                    <UFormField name="code" label="Enter verification code" class="w-full">
                      <UPinInput size="xl" v-model="stateLogin.code" type="number" class="w-full" :disabled="isLoading" :length="6" @complete="codeInputComplete"/>
                    </UFormField>

                    <div class="flex flex-row items-start gap-4">
                      <UButton :disabled="isLoading" type="submit">Log In</UButton>
                      <UButton color="neutral" :disabled="isLoading" @click="animatedChange('login')">
                        <UIcon name="i-material-symbols-arrow-back" class="w-4 h-4 mr-1"></UIcon>
                        Back</UButton>
                    </div>
                  </UForm>
                </div>
              </Transition>

              <Transition name="fade">
                <div v-if="status == 'sensitive_consent' && showPlaceholders" class="my-auto flex flex-col items-center gap-4">
                  <div class="flex flex-row items-center gap-4">
                    <div v-if="!userAvatarLoaded" class="w-[48px] h-[48px]">
                      <USkeleton class="w-full h-full rounded-full" />
                    </div>
                    <UAvatar v-else size="3xl" :src="userAvatarUrl"></UAvatar>

                    <UIcon name="i-material-symbols-link" class="text-primary size-10"></UIcon>
                    
                    <div v-if="!applicationAvatarLoaded" class="w-[48px] h-[48px]">
                      <USkeleton class="w-full h-full rounded-full" />
                    </div>
                    <UAvatar v-else size="3xl" :src="applicationAvatarUrl"></UAvatar>
                  </div>

                  <div>
                    <h3 class="text-mx">Allow <span class="bold">{{ applicationName }}</span> to...</h3>
                    <p v-if="usedScopes.includes('openid') || usedScopes.includes('profile') || usedScopes.includes('email')" class="flex flex-row items-center justify-center gap-2">
                      <UIcon name="i-material-symbols-check" class="text-primary"></UIcon>
                      <span class="text-sm">View your profile information</span>
                    </p>
                  </div>

                  <div class="flex flex-row gap-4">
                    <UButton @click="returnToApp({ result: 'success', code: 'example_code' })">
                      Sure
                    </UButton>
                    <UButton color="neutral" @click="returnToApp({ result: 'error', error: 'access_denied', error_description: 'User denied consent' })">
                      Nope
                    </UButton>
                  </div>
                </div>
              </Transition>

            </div>
        </div>
        
    </div>
  </div>
    
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'


const showLoading = ref(true)
const status = ref('load')
const error_description = ref('')
const error = ref('')
const isLoading = ref(false) // basically making all buttons uninteractable
const userId = ref<number | null>(null)
const applicationName = ref('')
const usedScopes: Ref<string[]> = ref([])
const route = useRoute()
const app: Ref<OAuth2Application | null> = ref(null)

const returnToApp = (options: any) => {

  isLoading.value = true

  if (options.result == "error") {
    const url = new URL(route.query.redirect_uri as string)
    url.searchParams.set('error', options.error)
    url.searchParams.set('error_description', options.error_description)
    window.location.href = url.toString()
  } else if (options.result == "success") {
    const url = new URL(route.query.redirect_uri as string)
    url.searchParams.set('code', options.code)
    url.searchParams.set('state', route.query.state as string)
    window.location.href = url.toString()
  }

}

const queryString = (value: unknown) => {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && value.length > 0) return value[0]
  return ''
}

const userAvatarUrl = computed(() =>
  `/api/users/${userId.value}/profile_picture`
)

const applicationAvatarUrl = computed(() => {
  const clientId = queryString(route.query.client_id)
  return clientId ? `/api/applications/${clientId}/profile_picture` : ''
})

const state = reactive({
  email: ''
})

const stateLogin = reactive({
  email: '',
  code: [] as number[]
})

import oAuth2Config from '~~/shared/oauth2'
import { LoginRequest, SendCodeRequest } from '~~/shared/schemas'
const link = `https://login.microsoftonline.com/
${oAuth2Config.tenant}/
oauth2/v2.0/authorize?
client_id=${oAuth2Config.clientId}
&response_type=${oAuth2Config.responseType}
&redirect_uri={CURRENT_URL_ORIGIN}${oAuth2Config.redirectUri}
&response_mode=query
&scope=${oAuth2Config.scope.replaceAll(' ', '%20')}`
const navigateToOAuth2 = () => {
  isLoading.value = true
  window.location.href = link.replace("{CURRENT_URL_ORIGIN}", window.location.origin);
}

const animatedChange = async (newStatus: string) => {
  isLoading.value = true
  status.value = "none"
  await delay(600)
  
  if (newStatus === 'sensitive_consent') {
    // Reset loading states
    userAvatarLoaded.value = false
    applicationAvatarLoaded.value = false
    showPlaceholders.value = false
    
    // Start preloading images
    const preloadPromises = [
      preloadImage(userAvatarUrl.value).then(() => {
        userAvatarLoaded.value = true
      }),
      preloadImage(applicationAvatarUrl.value).then(() => {
        applicationAvatarLoaded.value = true
      }),
    ]
    
    // Set timeout to show placeholders after 1 second
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        showPlaceholders.value = true
        resolve()
      }, 1000)
    })
    
    // Wait for either all images to load or timeout
    await Promise.race([
      Promise.all(preloadPromises),
      timeoutPromise
    ])
  }
  
  status.value = newStatus
  isLoading.value = false
}

const toast = useToast()

async function onSendCodeSubmit(event: FormSubmitEvent<SendCodeRequest>) {
  const { email } = event.data

  isLoading.value = true

  try {
    await withLoadingIndicator(async () => {
      const res = await $fetch('/api/auth/code', {
        method: 'POST',
        body: { email },
      })
      stateLogin.email = email
      // console.log(1)
      status.value = 'none'
      await delay(600)
      // console.log(2)
      status.value = 'code_sent'
      isLoading.value = false
    })
  } catch (e) {
    toast.add({
      color: 'error',
      title: 'Failed to send verification code',
      description: getErrorMessage(e),
    })
  } finally {
    isLoading.value = false
  }
}

async function submitCode(code: number[]) {
  isLoading.value = true

  try {
    await withLoadingIndicator(async () => {
      const res: any = await $fetch('/api/auth/login', {
        method: 'POST',
        body: { email: stateLogin.email, code },
      })
      userId.value = res.id
      
      if (app.value?.type == "first") {
        returnToApp({ result: 'success', code: res.code})
      } else {
        animatedChange('sensitive_consent')
      }
    })
  } catch (e) {
    toast.add({
      color: 'error',
      title: 'Failed to log in',
      description: getErrorMessage(e),
    })
  } finally {
    isLoading.value = false
  }
}

async function onSendCodeLoginSubmit(event: FormSubmitEvent<LoginRequest>) {
  const { code } = event.data

  await submitCode(code)
}

const codeInputComplete = () => {
  if (stateLogin.code.length == 6) {
    submitCode(stateLogin.code)
  }
}


//////// MATRIX PAINT JOB

const canvas = ref<HTMLCanvasElement | null>(null)
let animationFrameId = 0
let drops: Array<number> = []
let fontSize = 18
let columnCount = 0
let width = 0
let height = 0
let ctx: CanvasRenderingContext2D | null = null

const userAvatarLoaded = ref(false)
const applicationAvatarLoaded = ref(false)
const avatarsReady = computed(() => userAvatarLoaded.value && applicationAvatarLoaded.value)
const showPlaceholders = ref(false)

const preloadImage = (url: string): Promise<void> => {
  return new Promise((resolve) => {
    if (!url) {
      resolve()
      return
    }
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = url
  })
}

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

  const client_id = queryString(route.query.client_id)
  const response_type = queryString(route.query.response_type)
  const scope = queryString(route.query.scope)
  const state = queryString(route.query.state)
  const code_challenge = queryString(route.query.code_challenge)
  const code_challenge_method = queryString(route.query.code_challenge_method)
  const redirect_uri = queryString(route.query.redirect_uri)
  
  usedScopes.value = decodeURI(scope).split(" ")

  // if(!(client_id && response_type && scope && redirect_uri)) {
  //   await fade();
  //   status.value = 'error'
  //   error.value = "invalid_request"
  //   error_description.value = "Missing one of more of the following parameters: 'client_id', 'response_type', 'scope', 'redirect_uri'"
    
  // }

  
  if (client_id) {
    const res1: any = await fetch("/api/oauth2/session?client_id=" + client_id + "&scope=" + scope)
    const js = await res1.json()

    if (res1.status != 200) {
      await fade();
      status.value = 'error'
      error.value = "invalid_request"
      error_description.value = js.message
    } else {
      await fade();
      applicationName.value = js.name
      app.value = js
      status.value = 'login'
      
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
<template>
  <div class="w-full h-full -z-15">
    <canvas ref="canvas" class="fixed inset-0 -z-10 w-full h-full bg-black"/>
    <div class="flex flex-col items-center justify-center min-h-screen">
        <div class="rounded-md bg-default w-full max-w-md px-8 text-center">

            <div class="relative flex items-center justify-center my-8">
              <UIcon name="i-material-symbols-arrow-back" class="absolute left-0 w-6 h-6 cursor-pointer hover:opacity-80 transition-opacity" @click="returnToApp({result:'cancel'})" />
              <p class="text-xl bold glow text-primary">{{ WEBSITE_NAME }}</p>
            </div>
            <USeparator></USeparator>

            <div class="w-full h-80 flex flex-row justify-center items-start my-8">

              <Transition name="fade">
                <LoaderAnimationInline v-if="showLoading" class="my-auto"/>
              </Transition>

              <Transition name="fade">
                <div v-if="status == 'error'" class="my-auto">
                  <UIcon name="i-material-symbols-error-rounded" class="w-8 h-8 text-red-400"/>
                  <h3 class="text-sm text-red-400">There was a problem during your login</h3>
                  <p class="mt-4 text-sm" v-html="error_description" />

                  <UButton v-if="!error_description_initial" color="neutral" class="mt-8" :disabled="isLoading" @click="restartLoginProcess">Try Again</UButton>
                </div>
              </Transition>

              <Transition name="fade">

                <div v-if="status == 'login'" class="w-full flex flex-col gap-4 items-start justify-start">

                  <div class="text-left">
                    <h3 class="text-xl bold mb-0">Sign in</h3>
                    <span v-if="app" class="text-sm">To <span class="text-primary">{{ app.name ? app.name : "continue to Application" }}</span></span>
                  </div>
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

                  <USeparator class="w-full"/>

                  <UForm class="w-full flex flex-col items-start gap-4 text-left">
                    

                      <UFormField name="email" label="or use the following...">
                        <UButton :disabled="isLoading" @click="navigateToOAuth2"> 
                          <img src="/assets/Microsoft_logo.svg" alt="Microsoft Logo" class="w-5 h-5 mr-2" >
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
                        <UIcon name="i-material-symbols-link-2" class="w-4 h-4"/>
                      </ULink>
                      
                       (not email).</span>
                    <UFormField name="code" label="Enter verification code" class="w-full">
                      <UPinInput v-model="stateLogin.code" size="xl" type="number" class="w-full" :disabled="isLoading" :length="6" @complete="codeInputComplete"/>
                    </UFormField>

                    <div class="flex flex-row items-start gap-4">
                      <UButton :disabled="isLoading" type="submit">Log In</UButton>
                      <UButton color="neutral" :disabled="isLoading" @click="restartLoginProcess">
                        <UIcon name="i-material-symbols-arrow-back" class="w-4 h-4 mr-1"/>
                        Back</UButton>
                    </div>
                  </UForm>
                </div>
              </Transition>

              <Transition name="fade">
                <div v-if="status == 'sensitive_consent' && showPlaceholders" class="flex flex-col items-center gap-4 h-full justify-center">
                  <div class="flex flex-row items-center gap-4">
                    <div v-if="!userAvatarLoaded" class="w-[48px] h-[48px]">
                      <USkeleton class="w-full h-full rounded-full" />
                    </div>
                    <UAvatar v-else size="3xl" :src="userAvatarUrl"/>

                    <UIcon name="i-material-symbols-link" class="text-primary size-10"/>
                    
                    <div v-if="!applicationAvatarLoaded" class="w-[48px] h-[48px]">
                      <USkeleton class="w-full h-full rounded-full" />
                    </div>
                    <UAvatar v-else size="3xl" :src="applicationAvatarUrl"/>
                  </div>

                  <div>
                    <h3 class="text-mx mb-2">Allow <span class="bold">{{ applicationName }}</span> to...</h3>
                    <p v-for="desc in parsedScopeDescriptions" :key="desc.msg" class="flex flex-row items-center justify-center gap-2">
                      <UIcon v-if="!desc.sensitive" name="i-material-symbols-check" class="text-primary"/>
                      <UIcon v-else name="i-heroicons-exclaimation-circle-solid" class="text-yellow-600"/>
                      <span class="text-sm">{{ desc.msg }}</span>
                      <UTooltip :delay-duration="0" :text="desc.tooltip">
                        <UIcon v-if="desc.tooltip" name="i-lucide-circle-question-mark" class="text-muted"></UIcon>
                      </UTooltip>
                    </p>
                  </div>

                  <div class="flex flex-row gap-4">
                    <UButton @click="returnToApp({ result: 'consent'})" :disabled="isLoading">
                      Consent
                    </UButton>
                    <UButton color="neutral" @click="returnToApp({ result: 'deny'})" :disabled="isLoading" >
                      Deny
                    </UButton>
                  </div>

                  <div v-if="apiUser && apiUser.name" class="inline-flex items-center gap-2">
                    <span class="text-xs text-muted">
                      <UIcon name="i-lucide-user"></UIcon>
                      Logged in as
                    </span>
                    <UserPopover :user="apiUser">
                      <span class="text-xs underline select-none">
                        {{ apiUser.name }}
                      </span>
                    </UserPopover>
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
import { OAuth2ScopeDescriptions, OAuth2Scopes } from '~~/shared/oauth2-scopes'

import { LoginRequest, SendCodeRequest } from '~~/shared/schemas'
import { buildOAuth2SessionBody } from '~~/app/utils/oauth2'


const showLoading = ref(true)
const status = ref('load')
const error_description = ref('')
const error_description_initial = ref(true)
const error = ref('')
const isLoading = ref(false) // basically making all buttons uninteractable
const userId = ref<number | null>(null)
const apiUser = ref<APIUser | null>(null)
const applicationName = ref('')
const usedScopes: Ref<string[]> = ref([])
const parsedScopeDescriptions: Ref<any> = computed(() => {

  const readable = []
  if (usedScopes.value.includes("openid") || usedScopes.value.includes("profile") || usedScopes.value.includes("email")) {
    readable.push({msg: "View your basic account information", sensitive: false})
  }

  for (const scope of usedScopes.value) {
    if (scope == "openid" || scope == "profile" || scope == "email") continue

    readable.push({msg: OAuth2Scopes[scope]?.description|| 'Bake you a cake (mystery permission)', sensitive: OAuth2Scopes[scope]?.sensitive, tooltip: OAuth2Scopes[scope]?.tooltip})
  }

  readable.sort((a, b) => {
    if (a.msg === "View your basic account information") return -1
    if (b.msg === "View your basic account information") return 1
    return (b.sensitive ? 1 : 0) - (a.sensitive ? 1 : 0)
  })

  return readable
})
const route = useRoute()
const app: Ref<OAuth2Application | null> = ref(null)

const returnToApp = async (options: any) => {

  isLoading.value = true

  const result = options.result

  const res: any = await $fetch("/api/oauth2/session", {
    method: "DELETE",
    body: {
      action: result
    }
  })

  if (res.redirect_to) {
    window.location.href = res.redirect_to
  } else {
    await showLoginError(res.message, res.message == "session_expired")
  } 

}

const queryString = (value: unknown) => {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && value.length > 0) return value[0]
  return ''
}

const swapQuotesToCode = (message: string): string => {
  let inside = false
  let result = ''
  for (const char of message) {
    if (char === "'") {
      result += inside ? '</code>' : '<code>'
      inside = !inside
    } else {
      result += char
    }
  }
  return result
}

const userAvatarUrl = computed(() =>
  `/api/users/${userId.value}/profile_picture`
)

const applicationAvatarUrl = computed(() => {
  const clientId = queryString(route.query.client_id)
  return clientId ? `/api/applications/${clientId}/profile_picture` : ''
})

const state = reactive({
  email: '',
  token: ''
})

const stateLogin = reactive({
  email: '',
  code: [] as number[],
  token: ''
})

const restartLoginProcess = async () => {
  state.email = ""
  state.token = ""
  stateLogin.email = ""
  stateLogin.code = []
  stateLogin.token = ""
  isLoading.value = true
  status.value = "none"
  await loginFlowCheck(true)
  animatedChange("login")
}
const navigateToOAuth2 = async () => {
  isLoading.value = true

  try {
    const res: any = await $fetch('/api/oauth2/to_microsoft', {
      method: 'POST'
    })
    const js = res
    const url = js.redirect_to
    if (!url) {
      toast.add({
        title: "Login Failed",
        description: js.message,
        color: "error"
      })
      return
    }
    await navigateTo(url, {external:true})
  } catch (e: any) {
    if (getErrorMessage(e) == "session_expired") {
      await showLoginError(e, true)
    } else {
      toast.add({
        title: "Login Failed",
        description: getErrorMessage(e),
        color: "error"
      })
    }
    
  }
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
    
    // Set timeout to show placeholders after 0.2 second
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        showPlaceholders.value = true
        resolve()
      }, 100)
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
  } catch (e: any) {
    if (getErrorMessage(e) == "session_expired") {
      await showLoginError(e, true)
    } else {
      toast.add({
        title: "Login Failed",
        description: getErrorMessage(e),
        color: "error"
      })
    }
    
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
      userId.value = res.user.id
      apiUser.value = res.user
      if (!res.sensitive) {
        await animatedChange("none")
        showLoading.value = true
        returnToApp({result: "assume_consent"}) // stupid function but ill tell u here: it just redirects to res.redirect_to lol
      } else {
        animatedChange('sensitive_consent')
      }
    })
  } catch (e: any) {
    if (getErrorMessage(e) == "session_expired") {
      await showLoginError(e, true)
    } else {
      toast.add({
        title: "Login Failed",
        description: getErrorMessage(e),
        color: "error"
      })
    }
  } finally {
    isLoading.value = false
  }
}

async function showLoginError(error: any, allow_back: boolean = true) {
  error_description.value = swapQuotesToCode(getErrorMessage(error) == "session_expired" ? "Your login session has expired. Please restart the login process." : getErrorMessage(error))
  error_description_initial.value = !allow_back
  animatedChange("error")
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


const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fade(duration: number = 700) {
  showLoading.value = false
  await delay(duration)
}

async function submitNewSession(client_id: string, response_type: string, scope: string, oauthState: string, code_challenge: string, code_challenge_method: string, redirect_uri: string) {
  const body = buildOAuth2SessionBody({
    client_id,
    response_type,
    scope,
    state: oauthState,
    code_challenge,
    code_challenge_method,
    redirect_uri,
  })

  await $fetch('/api/oauth2/session', {
    method: 'POST',
    body,
  })
}

async function loginFlowCheck(reattempt: boolean = false) {

  const err = useCookie("bridge_error")
  if (err.value) {
    // Dont proceed to normal login if detected error
    const json: any = JSON.parse(atob(err.value as string))
    await fade()
    status.value = 'error'
    error.value = "invalid_request"
    error_description.value = swapQuotesToCode(json.message)
    err.value = undefined
    return
  }

  const client_id = queryString(route.query.client_id)
  const response_type = queryString(route.query.response_type)
  const scope = queryString(route.query.scope)
  const state = queryString(route.query.state)
  const code_challenge = queryString(route.query.code_challenge)
  const code_challenge_method = queryString(route.query.code_challenge_method)
  const redirect_uri = queryString(route.query.redirect_uri)
  
  usedScopes.value = decodeURI(scope).split(" ")

  
  if (client_id) {
    const res1: any = await fetch("/api/oauth2/session", {
      method: "GET"
    })
    const js = await res1.json()

    if (res1.status != 200) {
      // bad
      if (reattempt) {
        await submitNewSession(client_id, response_type, scope, state, code_challenge, code_challenge_method, redirect_uri)
      } else {
        await fade();
        status.value = 'error'
        error.value = "invalid_request"
        error_description.value = swapQuotesToCode(js.message)
        error_description_initial.value = true
      }
      
    } else {
      // 做的好 ！！！！  

      applicationName.value = js.name
      app.value = js
      userId.value = js.user_id
      apiUser.value = js.user
      

      if (js.login_state == "consent") {
        fade(0);
        animatedChange("sensitive_consent")
      } else {
        await fade();
        status.value = 'login'
      }
    }
  }
  
  
}












//////// MATRIX PAINT JOB

const canvas = ref<HTMLCanvasElement | null>(null)
const animationFrameId = 0
let drops: Array<number> = []
const fontSize = 18
let columnCount = 0
let width = 0
let height = 0
let ctx: CanvasRenderingContext2D | null = null

const userAvatarLoaded = ref(false)
const applicationAvatarLoaded = ref(false)
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

const matrixCharacters = '01ABCDEFGHIJKLMNOPQRSTUVWXYZАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ'

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
    // @ts-ignore
    const y = drops[i] * fontSize;

    ctx.fillText(text, x, y)

    if (y > height && Math.random() > 0.975) {
      drops[i] = 0
    }
    // @ts-ignore
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
  
  layout: false
})

useHead({
  title: `Authentication | ${WEBSITE_NAME}`,
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
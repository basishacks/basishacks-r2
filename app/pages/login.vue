<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { LoginRequest, SendCodeRequest } from '~~/shared/schemas'
import oAuth2Config from '~~/shared/oauth2'

useHead({
  title: `Login | ${WEBSITE_NAME}`,
})

const toast = useToast()
const { fetch: refreshAuth } = useUserSession()

const isSendingCode = ref(true)
const isLoading = ref(false)

const route = useRoute()

const link = `https://login.microsoftonline.com/
${oAuth2Config.tenant}/
oauth2/v2.0/authorize?
client_id=${oAuth2Config.clientId}
&response_type=${oAuth2Config.responseType}
&redirect_uri={CURRENT_URL_ORIGIN}${oAuth2Config.redirectUri}
&response_mode=query
&scope=${oAuth2Config.scope.replaceAll(' ', '%20')}`


const state = reactive({
  email: '',
  code: '',
})

const navigateToOAuth2 = () => {
  window.location.href = link.replace("{CURRENT_URL_ORIGIN}", window.location.origin);
}

async function onSendCodeSubmit(event: FormSubmitEvent<SendCodeRequest>) {
  const { email } = event.data

  isLoading.value = true

  try {
    await withLoadingIndicator(async () => {
      const res = await $fetch('/api/auth/code', {
        method: 'POST',
        body: { email },
      })
      toast.add({
        color: 'success',
        title: res.message,
        description: 'Please enter the code to log in',
      })
      isSendingCode.value = false
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

</script>

<template>
  <div class="'mt-4'">
    <h1 class="text-4xl bold mb-4">Log in</h1>

    <UForm
      v-if="isSendingCode"
      :state="state"
      :schema="SendCodeRequest"
      class="max-w-[600px] space-y-4"
      @submit="onSendCodeSubmit"
    >
      <UFormField name="email" label="via your School Email">
        <UInput v-model="state.email" type="email" class="w-full" />
      </UFormField>

      <UButton :disabled="isLoading" type="submit"
        >Send verification code</UButton
      >
    </UForm>



    <UForm class="mt-5">
      <UFormField name="email" label="or use Microsoft Login">
          <UButton @click="navigateToOAuth2">
            <img src="/assets/microsoft_logo.svg" alt="Microsoft Logo" class="w-5 h-5 mr-2" />
            Login with Microsoft
          </UButton>
      </UFormField>

      
    </UForm>

    
  </div>


</template>

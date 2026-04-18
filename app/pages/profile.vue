<script setup>

import { UpdateUserRequest } from '~~/shared/schemas'

const toast = useToast()

definePageMeta({
  middleware: 'auth'
})

const { user: userRef, clear } = useUserSession()
const userID = computed(() => userRef.value?.id ?? 0)

const { data, error, refresh } = await useFetch(
  () => `/api/users/${userID.value}`
)
if (error.value) {
  throw error.value
}

const user = computed(() => data.value)

async function doLogout() {
  await clear()
  await navigateTo('/')
}

// edit form

const state = reactive({
  name: user.value.name || '',
  profile_theme_image: undefined
})

const fileToBase64 = function(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    // Read the file as a Data URL
    reader.readAsDataURL(file);

    
    reader.onload = () => resolve(reader.result);

    // Error callback
    reader.onerror = (error) => reject(error);
  });
};

async function onSubmitName(event) {
  try {
    
    let result;

    if (event.data.profile_theme_image != undefined && event.data.profile_theme_image instanceof File) {
      result = await fileToBase64(event.data.profile_theme_image);
      if (result)
      event.data.profile_theme_image = result.toString()
    } 

    const { message } = await withLoadingIndicator(async () => {
      return $fetch(`/api/users/${userID.value}`, {
        method: 'PATCH',
        body: event.data,
      })

      
    })
    toast.add({
      color: 'success',
      title: message,
    })
    await refresh()
    
    if (result) {
      state.profile_theme_image = undefined;
      fileUploadRef.value.style = `background-image:url("${result}");`
    }
    
  } catch (e) {
    toast.add({
      color: 'error',
      title: 'Failed to update profile',
      description: getErrorMessage(e),
    })
  }
}

const profileThemeMode = user.value.profile_theme?.mode

const profileThemeValue = ref(user.value.profile_theme)

const fileUploadRef = ref(null)

const profileLink = "/user/" + userID.value


onMounted(() => {
  if (profileThemeValue.value == undefined) return;

  if (fileUploadRef.value) {
    fileUploadRef.value.style = `background-image:url("/userast/${profileThemeValue.value.value}");`
  }
})

</script>



<template>
  <div>
      <h1 class="text-4xl bold mb-4">Hi, {{ user.name || user.email }}!</h1>

      <p class="mb-4">You are a {{ WEBSITE_NAME }} participant.</p>

      <UForm
        :state="state"
        :schema="UpdateUserRequest"
        class="max-w-[600px] space-y-4 my-8"
        @submit="onSubmitName"
      >
        <UFormField name="name" label="Edit your name">
          <UInput v-model="state.name" class="w-full" />
        </UFormField>

        <div class="flex gap-4">
          <UButton type="submit">Update profile</UButton>
          <UButton color="warning" variant="subtle" @click="doLogout"
            >Log out</UButton
          >
        </div>

        <USeparator></USeparator>

        <UFormField name="profile_image" label="Profile Image">
          <p class="text-muted text-xs">Your... Profile picture?</p>
          <p class="text-muted text-xs">This setting will affect</p>
          
          <div class="w-full mt-4 rounded-md bg-gray-500 rounded-xl bg-center bg-cover bg-no-repeat" ref="fileUploadRef">
            <UFileUpload
          label="Click to drop image to upload"
          description="PNG, JPG or GIF (max. 2MB)"
          accept="image/jpeg, image/jpg, image/png, image/webp"
          v-model="state.profile_theme_image"
          class="z-1"
          :ui="{
            base: `min-h-48 bg-white/0`,
            wrapper: `bg-(--ui-bg)/85 rounded-xl`
          }"
          />
          </div>

          
        </UFormField>

        <USeparator></USeparator>

        <UFormField name="profile_theme_image" label="Profile Theme">
          <p class="text-muted text-xs">Select the theme of your profile.</p>
          <p class="text-muted text-xs">This setting will affect the background display of your <ULink :to="profileLink">profile page</ULink> and your <UserPopover user="5"><span class="underline">profile card</span></UserPopover></p>
          
          <div class="w-full mt-4 rounded-md bg-gray-500 rounded-xl bg-center bg-cover bg-no-repeat" ref="fileUploadRef">
            <UFileUpload
          label="Click to drop image to upload"
          description="PNG, JPG or GIF (max. 2MB)"
          accept="image/jpeg, image/jpg, image/png, image/webp"
          v-model="state.profile_theme_image"
          class="z-1"
          :ui="{
            base: `min-h-48 bg-white/0`,
            wrapper: `bg-(--ui-bg)/85 rounded-xl`
          }"
          />
          </div>

          
        </UFormField>

        <UButton type="submit">Update profile</UButton>


        
      </UForm>

      


    </div>
</template>
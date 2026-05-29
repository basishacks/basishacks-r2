<script setup lang="ts">

const backgroundRef = ref(null)

setPageLayout("fullwidth")

const route = useRoute()
const userID = route.params.id as string;

const { data, error, refresh } = await useFetch<APIUser>(
  () => `/api/users/${userID}`
)
if (error.value) {
  throw createError(
    {
      status: 404,
      statusText: "User not found"
    }
  )
}

const user = computed(() => data.value as APIUser)

onMounted(() => {
  const e: any = backgroundRef.value;
  if (e && user.value?.profile_theme?.value) {
    e.style = `background-image: url(/userast/${user.value.profile_theme.value})`;
  }
})

</script>

<template>
  <div ref="backgroundRef" class="bg-center bg-cover">
    <UContainer class="h-[calc(100vh-var(--ui-header-height))] bg-default pt-4"/>
  </div>
</template>
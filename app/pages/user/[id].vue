<script setup lang="ts">
import { NOTFOUND } from 'dns';

const backgroundRef = ref(null)

setPageLayout("fullwidth")

const route = useRoute()
const userID = route.params.id;

const { data, error, refresh } = await useFetch(
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

const user = computed<APIUser>(() => data.value)

console.log(user)

onMounted(() => {
    const e: any = backgroundRef.value;
    e.style = `background-image: url(/assets/${user.value?.profile_theme?.value})`;
    
})

</script>

<template>
  <div ref="backgroundRef" class="bg-center bg-cover">
    <UContainer class="h-[calc(100vh-var(--ui-header-height))] bg-default pt-4">
      
    </UContainer>
</div>
</template>
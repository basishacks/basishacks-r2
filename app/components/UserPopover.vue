<template>
    <UPopover ref="popover" mode="hover" @update:open="handleHover">
        <slot/>

        <template #content>
            <Placeholder class="size-48 m-4 inline-flex" />
        </template>
    </UPopover>
</template>

<script setup lang="ts">

const props = defineProps({
    user: Number
})

const popover = ref(null)

const userdata = ref<APIUser | null>(null)

const handleHover = async (event: boolean) => {
    if (!event) return;
    if (userdata.value != null) return;

    const { data, error, refresh } = await useFetch<APIUser>(
        () => `/api/users/${props.user}`
    )
    if (error.value) {  
        throw error.value
    }

    userdata.value = data.value as APIUser

    console.log(userdata.value)
};
</script>
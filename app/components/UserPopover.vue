<template>
    <UPopover mode="hover" @update:open="handleHover" ref="popover">
        <slot></slot>

        <template #content>
            <Placeholder class="size-48 m-4 inline-flex" />
        </template>
    </UPopover>
</template>

<script setup lang="ts">
import { user } from '#build/ui';
import { queryObjects } from 'v8';


const props = defineProps({
    user: Number
})

const popover = ref(null)

const userdata = ref(null)

const handleHover = async (event: boolean) => {
    if (!event) return;
    if (userdata.value != null) return;

    const { data, error, refresh } = await useFetch(
        () => `/api/users/${props.user}`
    )
    if (error.value) {  
        throw error.value
    }

    userdata.value = data.value

    console.log(userdata.value)

};
</script>
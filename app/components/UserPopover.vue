<template>
    <UPopover mode="hover">
        <slot></slot>

        <template #content>
            <Placeholder class="size-48 m-4 inline-flex" />
        </template>
    </UPopover>
</template>
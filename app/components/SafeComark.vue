<script setup lang="ts">
const safeComponents = { a: SafeLink };
const safeOptions = { html: false };
</script>

<template>
    <Comark :options="safeOptions" :components="safeComponents">
        <slot />
    </Comark>
</template>

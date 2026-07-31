<script setup lang="ts">
import { data } from "../../data/tests.data";
</script>

<template>
    <span class="test-count">{{ data.total.toLocaleString() }}</span>
</template>

<style scoped>
.test-count {
    font-weight: 600;
    color: var(--vp-c-brand-1);
}
</style>

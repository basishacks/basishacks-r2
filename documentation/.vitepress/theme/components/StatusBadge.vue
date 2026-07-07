<script setup lang="ts">
interface Props {
    status?: "online" | "warn" | "error" | "info";
    text?: string;
}

withDefaults(defineProps<Props>(), {
    status: "online",
    text: "ONLINE",
});
</script>

<template>
    <span class="vp-status-badge" :class="`status-${status}`">
        <span class="badge-dot"></span>
        {{ text }}
    </span>
</template>

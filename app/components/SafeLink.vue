<script setup lang="ts">
const props = defineProps<{
    href?: string;
}>();

const isSafe = computed(() => isSafeUrl(props.href || ""));
const isExternal = computed(() => {
    try {
        const parsed = new URL(props.href || "");
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
});
</script>

<template>
    <a
        v-if="isSafe && isExternal"
        :href="href"
        target="_blank"
        rel="noopener noreferrer"
        class="text-primary hover:underline"
    >
        <slot />
    </a>
    <a v-else-if="isSafe" :href="href" class="text-primary hover:underline">
        <slot />
    </a>
    <span v-else class="text-muted line-through">
        <slot />
    </span>
</template>

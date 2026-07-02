<script setup lang="ts">
import { ref } from "vue";

interface Props {
    content: string;
    label?: string;
}

const props = defineProps<Props>();
const copied = ref(false);

async function copy() {
    try {
        await navigator.clipboard.writeText(props.content);
        copied.value = true;
        setTimeout(() => (copied.value = false), 1500);
    } catch {
        // Fallback for environments without clipboard API
        const textarea = document.createElement("textarea");
        textarea.value = props.content;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand("copy");
            copied.value = true;
            setTimeout(() => (copied.value = false), 1500);
        } finally {
            document.body.removeChild(textarea);
        }
    }
}
</script>

<template>
    <button class="vp-copy-button" :class="{ copied }" @click="copy" type="button">
        <span v-if="copied">✓ copied</span>
        <span v-else>{{ label ?? "copy" }}</span>
    </button>
</template>

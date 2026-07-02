<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

interface Props {
    target: number;
    duration?: number;
    suffix?: string;
}

const props = withDefaults(defineProps<Props>(), {
    duration: 2000,
    suffix: "",
});

const display = ref(0);
let raf: number | null = null;

onMounted(() => {
    const start = performance.now();
    const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / props.duration, 1);
        // easeOutQuart
        const eased = 1 - Math.pow(1 - progress, 4);
        display.value = Math.floor(eased * props.target);
        if (progress < 1) {
            raf = requestAnimationFrame(animate);
        }
    };
    raf = requestAnimationFrame(animate);
});

onUnmounted(() => {
    if (raf !== null) cancelAnimationFrame(raf);
});
</script>

<template>
    <span class="vp-animated-counter">
        {{ display }}
        <span v-if="suffix" class="counter-suffix">{{ suffix }}</span>
    </span>
</template>

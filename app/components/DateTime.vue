<script setup lang="ts">
import { toValidDate, type DateInput } from "~/utils/datetime";

const props = defineProps<{
    date: DateInput;
}>();

const normalizedDate = computed(() => toValidDate(props.date));

const text = computed(() => {
    const date = normalizedDate.value;
    if (!date) return "Date unavailable";

    return date.toLocaleString("en-CA", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Shanghai",
    });
});

const dateTime = computed(() => normalizedDate.value?.toISOString());
</script>

<template>
    <time :datetime="dateTime">
        <ClientOnly>{{ text }}</ClientOnly>
    </time>
</template>

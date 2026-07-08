<template>
    <UTooltip :delay-duration="1">
        <UButton
            :size="props.size"
            :icon="props.award.icon"
            variant="subtle"
            :color="convertColor(props.award)"
        ></UButton>
        <template #content>
            <p class="text-sm bold">{{ props.award.name }}</p>
            -
            <p class="text-xs">{{ props.award.description }}</p>
        </template>
    </UTooltip>
</template>

<script setup lang="ts">
const props = defineProps<{
    award: APIAward;
    size: any;
}>();

const convertColor = (award: APIAward) => {
    console.log(award);

    switch (award.color) {
        case "gold":
            return "warning";
        case "silver":
            return "neutral";
        case "bronze":
            return "error";
        default:
            return "success";
    }
};
</script>

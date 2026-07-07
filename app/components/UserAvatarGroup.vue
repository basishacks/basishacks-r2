<script setup lang="ts">
const props = defineProps<{
    users: Array<
        | {
              name?: string | null;
              email?: string;
              profile_picture?: string | null;
          }
        | null
        | undefined
    >;
    size?: "3xs" | "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
    max?: number | string;
    class?: any;
    ui?: any;
}>();
</script>

<template>
    <UPopover mode="hover" class="w-fit">
        <UAvatarGroup :size="size" :max="max" :class="class" :ui="ui">
            <UserAvatar v-for="(user, index) in users" :key="index" :user="user" :size="size" />
        </UAvatarGroup>

        <template #content>
            <div class="max-h-48 overflow-y-auto p-2 space-y-1 min-w-[200px]">
                <div
                    v-for="(user, index) in users"
                    :key="index"
                    class="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-elevated/50"
                >
                    <UserItem :user="user" size="sm" />
                </div>
            </div>
        </template>
    </UPopover>
</template>

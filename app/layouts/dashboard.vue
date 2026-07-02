<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const { data: hackathon, error: hackathonError } = await useFetch("/api/seasons/active");
if (hackathonError.value) {
    throw hackathonError.value;
}

const items = ref<NavigationMenuItem[][]>([
    [
        {
            label: "Dashboard",
            type: "label",
        },

        {
            label: "Overview",
            icon: "i-lucide-info",
            to: "/dashboard",
        },
        {
            label: "Team",
            icon: "i-fluent-people-team-16-filled",
            to: "/dashboard/teams",
        },

        {
            label: "General",
            icon: "i-lucide-file-text",
            to: "/dashboard/general",
        },

        // {
        //       label: 'Presentation',
        //       icon: 'i-lucide-presentation',
        //       to: '/dashboard/presentation',
        //       chip: true
        // },
    ],
    [
        {
            label: "Results",
            icon: "i-lucide-trophy",
            to: "/dashboard/results",
        },
    ],
    [
        {
            label: "Help",
            icon: "i-lucide-circle-help",
            to: "https://teams.microsoft.com/l/channel/19%3Ae352153b90524d81b9f9b50c7dd84d12%40thread.tacv2/QnA?groupId=b207a655-d801-4200-8345-5dcc50d6d957&tenantId=cbc6e1e2-a6bb-4002-bbdc-6da892a051a7",
            target: "_blank",
        },
    ],
]);
</script>

<template>
    <!-- <div class="flex flex-row items-start justify-start">
    <UNavigationMenu class="pl-16 pr-4 border-r border-default h-full h-100vh" orientation="vertical" :items="items" />
    <div class="bg-white-100 p-64"></div>
  </div> -->

    <RoleHeader />

    <UContainer class="flex flex-col">
        <div class="fixed -translate-x-full -mx-12 mt-12">
            <UCard>
                <template #header>
                    <span
                        v-if="hackathon?.status === 'ongoing'"
                        class="uppercase text-sm font-bold text-muted"
                    >
                        ongoing
                    </span>
                    <span v-else class="uppercase text-sm font-bold text-muted">completed</span>
                    <h3 class="text-2xl bold glow">May 2026</h3>
                    <span class="">Beneath the Surface</span>
                    <USeparator class="my-4" size="sm" />
                    <ULink
                        class="text-xs"
                        href="https://slack-files.com/T09V59WQY1E-F0A8LUTHZHQ-0eb4891888"
                    >
                        See event details
                        <UIcon name="i-lucide-arrow-right" />
                    </ULink>
                </template>
            </UCard>
            <UNavigationMenu
                orientation="vertical"
                :items="items"
                class="data-[orientation=vertical]:w-48 mt-12"
            />
        </div>

        <div class="mt-12 mx-auto max-w-(--ui-container)">
            <UBanner
                id="hoverdashnotif"
                color="neutral"
                class="z-0 my-4 nopanel text-xs text-muted rounded-md show-small"
                title="You can also hover or expand the dashboard tab to see more options"
                close
            />

            <slot />
        </div>
    </UContainer>
</template>

<style scoped>
.metallic-gold {
    background: linear-gradient(
        135deg,
        #ffd700 0%,
        #ffa500 25%,
        #ffd700 50%,
        #ffa500 75%,
        #ffd700 100%
    );
    background-size: 200% 200%;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: none;
    animation: shimmer 3s ease-in-out infinite;
}

.metallic-silver {
    background: linear-gradient(
        135deg,
        #e8e8e8 0%,
        #c0c0c0 25%,
        #e8e8e8 50%,
        #c0c0c0 75%,
        #e8e8e8 100%
    );
    background-size: 200% 200%;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: none;
    animation: shimmer 3s ease-in-out infinite;
}

.metallic-bronze {
    background: linear-gradient(
        135deg,
        #cd7f32 0%,
        #b87333 25%,
        #df9953 50%,
        #b87333 75%,
        #cd7f32 100%
    );
    background-size: 200% 200%;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: none;
    animation: shimmer 3s ease-in-out infinite;
}

@keyframes shimmer {
    0% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 50% 100%;
    }
    100% {
        background-position: 0% 50%;
    }
}

.hide-small {
    @media (width < 1800px) {
        display: none;
    }
}

.show-small {
    @media (width >= 1800px) {
        display: none;
    }
}
</style>

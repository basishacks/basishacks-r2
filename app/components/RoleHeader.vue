<template>
    <UHeader>
        <template #title>
            <span class="text-primary">basishacks_2026</span>
        </template>

        <UNavigationMenu :items="navItems" />

        <template #right>
            <UColorModeButton />
            <UButton variant="ghost" :class="profileIconColor" href="/profile">
                <template v-if="userRef">
                    <UserAvatar :user="user" size="sm" />
                </template>
                <UIcon v-else name="i-material-symbols-account-circle-full" class="text-xl" />
            </UButton>
        </template>

        <template #body>
            <UNavigationMenu :items="navItems" orientation="vertical" class="-mx-2.5" />
        </template>
    </UHeader>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";
import { hasPermission } from "~~/shared/permissions";

const { user: userRef } = useUserSession();
// this is honestly ugly asf but i can't think of a clean solution
const { data: user } = useFetch<GetUserResponse>(
    () => (userRef.value?.id ? `/api/users/${userRef.value.id}` : null),
    { lazy: true },
);
const { data: hackathon } = useFetch("/api/seasons/active", { lazy: true });

const profileIconColor = computed(() => {
    return userRef.value ? "text-primary" : "text-ui-muted";
});

const dashboardContent: NavigationMenuItem[] = [
    {
        label: "Overview",
        icon: "i-lucide-info",
        to: "/dashboard",
    },

    {
        label: "General",
        icon: "i-lucide-file-text",
        to: "/dashboard/general",
    },

    {
        label: "Teams",
        icon: "i-fluent-people-team-16-filled",
        to: "/dashboard/teams",
    },

    {
        label: "Results",
        icon: "i-lucide-trophy",
        to: "/dashboard/results",
    },
];

const navItems = computed<NavigationMenuItem[]>(() => {
    const links = [
        {
            label: "Home",
            to: "/",
            icon: "i-material-symbols-home-outline",
        },
        {
            label: "Dashboard",
            to: "/dashboard",
            icon: "i-material-symbols-space-dashboard",
            children: dashboardContent,
        },
        {
            label: "Showcase",
            to: "/showcase",
            icon: "i-lucide-spotlight",
        },
    ];
    if (
        hackathon.value?.status === "voting" &&
        !hasPermission(user.value?.role, "judge") &&
        !hasPermission(user.value?.role, "admin")
    ) {
        links.push({
            label: "Voting",
            to: "/voting",
            icon: "i-material-symbols-star-rate",
        });
    }
    if (
        (hasPermission(user.value?.role, "judge") || hasPermission(user.value?.role, "admin")) &&
        hackathon.value?.status === "voting"
    ) {
        links.push({
            label: "Judging",
            to: "/judging",
            icon: "i-material-symbols-gavel",
        });
    }
    return links;
});
</script>

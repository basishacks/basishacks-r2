<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";
import { DevPermissions, hasPermission } from "~~/shared/permissions";

const { user, status } = await useApiUser({ lazy: true });

const lacksPermission = (permission: string) => {
    if (status.value === "idle" || status.value === "pending") return false;

    return (
        !hasPermission(user.value?.role, permission) && !hasPermission(user.value?.role, "admin")
    );
};

const items = computed<NavigationMenuItem[][]>(() => [
    [
        {
            label: "Home",
            icon: "i-lucide-house",
            to: "/developers",
        },
        {
            label: "Users",
            icon: "i-lucide-user",
            to: "/developers/users",
            disabled: lacksPermission(DevPermissions.PORTAL_USERS_VIEW),
        },
        {
            label: "Teams",
            icon: "i-lucide-users",
            to: "/developers/teams",
            disabled: lacksPermission(DevPermissions.PORTAL_TEAMS_VIEW),
        },
        {
            label: "Applications",
            icon: "i-lucide-app-window",
            to: "/developers/applications/",
            disabled: lacksPermission(DevPermissions.PORTAL_APPLICATIONS_VIEW),
            children: [
                {
                    label: "Create New",
                    icon: "i-lucide-plus",
                    to: "/developers/applications/create",
                    disabled: lacksPermission(DevPermissions.PORTAL_APPLICATIONS_CREATE),
                },
            ],
        },
        {
            label: "DeepSeek",
            icon: "i-lucide-message-square",
            to: "/developers/deepseek",
            disabled: lacksPermission(DevPermissions.PORTAL_DEEPSEEK_VIEW),
        },
        {
            label: "Files",
            icon: "i-lucide-files",
            to: "/developers/debug",
            disabled: lacksPermission(DevPermissions.PORTAL_DEBUG_VIEW),
        },
        {
            label: "Seasons",
            icon: "i-lucide-calendar",
            to: "/developers/seasons",
            disabled: lacksPermission(DevPermissions.PORTAL_SEASONS_VIEW),
        },
    ],
    [
        {
            label: "Hackathon Administration",
            icon: "i-lucide-shield",
            to: "/developers/admin",
            disabled: !user.value || user.value.role !== "admin",
        },
    ],
]);

const name = computed(() => user.value?.name || "Log In");
</script>

<template>
    <UDashboardGroup>
        <UDashboardSidebar collapsible resizable :ui="{ footer: 'border-t border-default' }">
            <template #header="{ collapsed }">
                <ULink v-if="!collapsed" class="bold glow text-primary mx-auto" to="/">
                    {{ WEBSITE_NAME }}
                    <span class="text-secondary bold">devs</span>
                </ULink>
                <UButton
                    variant="ghost"
                    v-else-if="collapsed"
                    class="bold glow text-primary mx-auto"
                    @click="navigateTo('/')"
                >
                    b
                </UButton>
            </template>

            <template #default="{ collapsed }">
                <UButton
                    :label="collapsed ? undefined : 'Search...'"
                    icon="i-lucide-search"
                    color="neutral"
                    variant="outline"
                    block
                    :square="collapsed"
                >
                    <template v-if="!collapsed" #trailing>
                        <div class="flex items-center gap-0.5 ms-auto">
                            <UKbd value="meta" variant="subtle" />
                            <UKbd value="K" variant="subtle" />
                        </div>
                    </template>
                </UButton>

                <UNavigationMenu :collapsed="collapsed" :items="items[0]" orientation="vertical" />

                <UNavigationMenu
                    v-if="items[1]?.length"
                    :collapsed="collapsed"
                    :items="items[1]"
                    orientation="vertical"
                    class="mt-auto"
                />
            </template>

            <template #footer="{ collapsed }">
                <UButton
                    :avatar="{
                        src: user?.profile_picture ? `/userast/${user.profile_picture}` : undefined,
                        alt: name,
                        loading: 'lazy' as const,
                    }"
                    :label="collapsed ? undefined : name"
                    color="neutral"
                    variant="ghost"
                    class="w-full"
                    @click="navigateTo('/profile')"
                    :block="collapsed"
                />
            </template>
        </UDashboardSidebar>

        <slot></slot>
    </UDashboardGroup>
</template>

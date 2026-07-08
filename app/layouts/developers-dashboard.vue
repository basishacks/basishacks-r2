<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";
import { DevPermissions, hasPermission } from "~~/shared/permissions";

const { user } = useApiUser({ lazy: true });

// console.log(user.value)

// console.log(hasPermission(user.value?.role, DevPermissions.PORTAL_APPLICATIONS_VIEW))
//console.log(hasPermission(user.value?.role, DevPermissions.PORTAL_APPLICATIONS_VIEW))

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
            disabled:
                !hasPermission(user.value?.role, DevPermissions.PORTAL_USERS_VIEW) &&
                !hasPermission(user.value?.role, "admin"),
        },
        {
            label: "Teams",
            icon: "i-lucide-users",
            to: "/developers/teams",
            disabled:
                !hasPermission(user.value?.role, DevPermissions.PORTAL_TEAMS_VIEW) &&
                !hasPermission(user.value?.role, "admin"),
        },
        {
            label: "Applications",
            icon: "i-lucide-app-window",
            to: "/developers/applications/",
            disabled:
                !hasPermission(user.value?.role, DevPermissions.PORTAL_APPLICATIONS_VIEW) &&
                !hasPermission(user.value?.role, "admin"),
            children: [
                {
                    label: "Create New",
                    icon: "i-lucide-plus",
                    to: "/developers/applications/create",
                    disabled:
                        !hasPermission(
                            user.value?.role,
                            DevPermissions.PORTAL_APPLICATIONS_CREATE,
                        ) && !hasPermission(user.value?.role, "admin"),
                },
            ],
        },
        {
            label: "DeepSeek",
            icon: "i-lucide-message-square",
            to: "/developers/deepseek",
            disabled:
                !hasPermission(user.value?.role, DevPermissions.PORTAL_DEEPSEEK_VIEW) &&
                !hasPermission(user.value?.role, "admin"),
        },
        {
            label: "Files",
            icon: "i-lucide-files",
            to: "/developers/debug",
            disabled:
                !hasPermission(user.value?.role, DevPermissions.PORTAL_DEBUG_VIEW) &&
                !hasPermission(user.value?.role, "admin"),
        },
        {
            label: "Seasons",
            icon: "i-lucide-calendar",
            to: "/developers/seasons",
            disabled:
                !hasPermission(user.value?.role, DevPermissions.PORTAL_SEASONS_VIEW) &&
                !hasPermission(user.value?.role, "admin"),
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

<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";
import { DevPermissions, hasPermission } from "~~/shared/permissions";

const { user, status } = await useApiUser({ lazy: true });
const route = useRoute();

const isAdmin = computed(() => hasPermission(user.value?.role, "admin"));
const canViewApplications = computed(
    () =>
        isAdmin.value ||
        hasPermission(user.value?.role, DevPermissions.PORTAL_APPLICATIONS_VIEW) ||
        hasPermission(user.value?.role, DevPermissions.PORTAL_APPLICATIONS_VIEW_ALL),
);
const canCreateApplications = computed(
    () =>
        isAdmin.value || hasPermission(user.value?.role, DevPermissions.PORTAL_APPLICATIONS_CREATE),
);

const isApplicationsRoute = computed(() => route.path.startsWith("/developers/applications"));
const isApplicationCreateRoute = computed(() => route.path === "/developers/applications/create");

if (status.value !== "idle" && status.value !== "pending") {
    const hasAccess = isApplicationCreateRoute.value
        ? canCreateApplications.value
        : isApplicationsRoute.value
          ? canViewApplications.value
          : isAdmin.value;

    if (!hasAccess) {
        throw createError({ statusCode: 403, statusMessage: "Access Denied" });
    }
}

const sidebarItems = computed<NavigationMenuItem[][]>(() => {
    if (!isAdmin.value) {
        if (canViewApplications.value) {
            return [
                [
                    {
                        label: "Applications",
                        icon: "i-lucide-app-window",
                        to: "/developers/applications/",
                        children: canCreateApplications.value
                            ? [
                                  {
                                      label: "Create New",
                                      icon: "i-lucide-plus",
                                      to: "/developers/applications/create",
                                  },
                              ]
                            : undefined,
                    },
                ],
            ];
        }

        return [
            [
                {
                    label: "Create Application",
                    icon: "i-lucide-plus",
                    to: "/developers/applications/create",
                },
            ],
        ];
    }

    return [
        [
            { label: "Home", icon: "i-lucide-house", to: "/developers" },
            { label: "Users", icon: "i-lucide-user", to: "/developers/users" },
            { label: "Teams", icon: "i-lucide-users", to: "/developers/teams" },
            {
                label: "Applications",
                icon: "i-lucide-app-window",
                to: "/developers/applications/",
                children: [
                    {
                        label: "Create New",
                        icon: "i-lucide-plus",
                        to: "/developers/applications/create",
                    },
                ],
            },
            { label: "DeepSeek", icon: "i-lucide-message-square", to: "/developers/deepseek" },
            { label: "Files", icon: "i-lucide-files", to: "/developers/debug" },
            {
                label: "Season",
                icon: "i-lucide-clock",
                to: "/developers/season",
            },
        ],
    ];
});

const searchGroups = computed(() => [
    {
        key: "pages",
        label: "Pages",
        items: sidebarItems.value.flat().flatMap((item: any) => [
            { label: item.label, icon: item.icon, to: item.to },
            ...(item.children?.map((child: any) => ({
                label: `${item.label} / ${child.label}`,
                icon: child.icon,
                to: child.to,
            })) ?? []),
        ]),
    },
]);

const name = computed(() => user.value?.name || "Log In");
</script>

<template>
    <UDashboardGroup>
        <UDashboardSearch :groups="searchGroups" />

        <UDashboardSidebar collapsible esizable :ui="{ footer: 'border-t border-default' }">
            <template #header="{ collapsed, collapse }">
                <div class="flex items-center gap-1">
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
                </div>
            </template>

            <template #default="{ collapsed }">
                <UDashboardSearchButton :collapsed="collapsed" class="mb-1" />

                <UNavigationMenu
                    :collapsed="collapsed"
                    :items="sidebarItems[0]"
                    orientation="vertical"
                />

                <UNavigationMenu
                    v-if="sidebarItems[1]?.length"
                    :collapsed="collapsed"
                    :items="sidebarItems[1]"
                    orientation="vertical"
                    class="mt-auto"
                />
            </template>

            <template #footer="{ collapsed }">
                <UButton
                    :avatar="{
                        src: user?.id ? `/api/users/${user.id}/profile_picture` : undefined,
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

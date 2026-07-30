<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const { user, status } = await useApiUser({ lazy: true });

// Developer portal is admin-only — hard 403 for everyone else
if (status.value !== "idle" && status.value !== "pending") {
    if (!user.value || user.value.role !== "admin") {
        throw createError({ statusCode: 403, statusMessage: "Access Denied" });
    }
}

const items = computed<NavigationMenuItem[][]>(() => [
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
        { label: "Seasons", icon: "i-lucide-calendar", to: "/developers/seasons" },
    ],
    [
        {
            label: "Hackathon Administration",
            icon: "i-lucide-shield",
            to: "/developers/admin",
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

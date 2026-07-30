<script setup lang="ts">
import { hasPermission, DevPermissions } from "~~/shared/permissions";

definePageMeta({
    layout: "developers-dashboard",
});

const { user: me } = await useApiUser();

// Redirect admins to the full Hackathon Administration page
if (hasPermission(me.value?.role, "admin")) {
    await navigateTo("/developers/admin");
}

if (
    !hasPermission(me.value?.role, DevPermissions.PORTAL_SEASONS_VIEW) &&
    !hasPermission(me.value?.role, "admin")
) {
    useToast().add({
        title: "Access denied",
        description: "You do not have permission to view seasons.",
        color: "error",
    });
    throw await navigateTo("/developers");
}
</script>

<template>
    <UDashboardPanel id="seasons">
        <template #header>
            <UDashboardNavbar title="Seasons">
                <template #leading>
                    <UDashboardSidebarCollapse />
                </template>
            </UDashboardNavbar>
        </template>

        <template #body>
            <UCard>
                <template #header>
                    <h2 class="text-lg font-semibold">Active Season</h2>
                </template>

                <p class="text-sm text-ui-text-muted">
                    Season management has moved to
                    <ULink to="/developers/admin" class="text-primary underline">
                        Hackathon Administration
                    </ULink>
                    .
                </p>
            </UCard>
        </template>
    </UDashboardPanel>
</template>

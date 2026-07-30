<script setup lang="ts">
definePageMeta({
    layout: "developers-dashboard",
});

// This page is deprecated — redirect to the full Hackathon Administration page
await navigateTo("/developers/admin");
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

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';

const items: NavigationMenuItem[][] = [[{
  label: 'Home',
  icon: 'i-lucide-house',
  to: "/developers",
}, {
  label: 'Users',
  icon: 'i-lucide-user',
  to: "/developers/users"
}, {
  label: 'Teams',
  icon: 'i-lucide-users',
  to: "/developers/teams"
}, {
  label: 'Applications',
  icon: 'i-lucide-app-window',
  to: "/developers/applications"
}, {
  label: 'DeepSeek',
  icon: 'i-lucide-message-square',
  to: "/developers/deepseek"
}, {
  label: 'Debug',
  icon: 'i-lucide-bug',
  to: "/developers/debug"
}
], [{
  label: 'Feedback',
  icon: 'i-lucide-message-circle',
  to: 'https://github.com/nuxt-ui-templates/dashboard',
  target: '_blank'
}, {
  label: 'Help & Support',
  icon: 'i-lucide-info',
  to: 'https://github.com/nuxt/ui',
  target: '_blank'
}]]

</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar collapsible resizable :ui="{ footer: 'border-t border-default' }">
    <template #header="{ collapsed }">
      <h3 v-if="!collapsed" class="bold glow text-primary mx-auto">{{ WEBSITE_NAME }}<span class="text-secondary"> devs</span></h3>
      <h3 v-else-if="collapsed" class="bold glow text-primary mx-auto">b</h3>
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

      <UNavigationMenu
        :collapsed="collapsed"
        :items="items[0]"
        orientation="vertical"
      />

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
          src: 'https://github.com/benjamincanac.png',
          loading: 'lazy' as const
        }"
        :label="collapsed ? undefined : 'Benjamin'"
        color="neutral"
        variant="ghost"
        class="w-full"
        :block="collapsed"
      />
      <UColorModeButton />
    </template>
  </UDashboardSidebar>

  <slot></slot>

  </UDashboardGroup>
</template>

<style>
body {
  font-family: var(--font-mono)
}
</style>
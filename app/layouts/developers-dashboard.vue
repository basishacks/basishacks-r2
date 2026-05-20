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
  to: "/developers/applications/",
  children: [
    {
      label: "Create New",
      icon: "i-lucide-plus",
      to: "/developers/applications/create"
    }
  ]
}, {
  label: 'DeepSeek',
  icon: 'i-lucide-message-square',
  to: "/developers/deepseek"
}, {
  label: 'Files',
  icon: 'i-lucide-files',
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

const { loggedIn, session, user, clear, fetch } = useUserSession(); 
const res: any = await $fetch("/api/users/" + user.value?.id)

const name = ref(res.name ? res.name : "Log In")
const profile = ref('')


</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar collapsible resizable :ui="{ footer: 'border-t border-default' }">
    <template #header="{ collapsed }">
      <ULink v-if="!collapsed" class="bold glow text-primary mx-auto" to="/">{{ WEBSITE_NAME }}<span class="text-secondary bold"> devs</span></ULink>
      <UButton variant="ghost" v-else-if="collapsed" class="bold glow text-primary mx-auto" @click="navigateTo('/')">b</UButton>
    </template>

    <template #default="{ collapsed }">

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

    <template #footer="{ collapsed }" class="flex flex-row justify-end">

        <UButton
        :avatar="{
          alt: name,
          loading: 'lazy' as const
        }"
        :label="collapsed ? undefined : name"
        color="neutral"
        variant="ghost"
        class="w-full"
        @click="navigateTo('/profile')"
        :block="collapsed"
      />
      <UColorModeButton :class="collapsed ? 'hidden' : 'block'" />

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
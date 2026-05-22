<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';
import { DevPermissions, hasPermission } from '~~/shared/permissions';

const { user: sessionUser, clear } = useUserSession()

const { data: user } = await useFetch<GetUserResponse>(
  () => sessionUser.value?.id ? `/api/users/${sessionUser.value.id}` : ``
)

const items: NavigationMenuItem[][] = [[{
  label: 'Home',
  icon: 'i-lucide-house',
  to: "/developers",
}, {
  label: 'Users',
  icon: 'i-lucide-user',
  to: "/developers/users",
  disabled: !hasPermission(user.value?.role, DevPermissions.PORTAL_USERS_VIEW) && !hasPermission(user.value?.role, 'admin')
}, {
  label: 'Teams',
  icon: 'i-lucide-users',
  to: "/developers/teams",
  disabled: !hasPermission(user.value?.role, DevPermissions.PORTAL_TEAMS_VIEW) && !hasPermission(user.value?.role, 'admin')
}, {
  label: 'Applications',
  icon: 'i-lucide-app-window',
  to: "/developers/applications/",
  disabled: !hasPermission(user.value?.role, DevPermissions.PORTAL_APPLICATIONS_VIEW) && !hasPermission(user.value?.role, 'admin'),
  children: [
    {
      label: "Create New",
      icon: "i-lucide-plus",
      to: "/developers/applications/create",
      disabled: !hasPermission(user.value?.role, DevPermissions.PORTAL_APPLICATIONS_CREATE) && !hasPermission(user.value?.role, 'admin')
    }
  ]
}, {
  label: 'DeepSeek',
  icon: 'i-lucide-message-square',
  to: "/developers/deepseek",
  disabled: !hasPermission(user.value?.role, DevPermissions.PORTAL_DEEPSEEK_VIEW) && !hasPermission(user.value?.role, 'admin')
}, {
  label: 'Files',
  icon: 'i-lucide-files',
  to: "/developers/debug",
  disabled: !hasPermission(user.value?.role, DevPermissions.PORTAL_DEBUG_VIEW) && !hasPermission(user.value?.role, 'admin')
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

const name = computed(() => user.value?.name || 'Log In')
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

    <template #footer="{ collapsed }" class="flex flex-row justify-end">

        <UButton
        :avatar="{
          src: user?.profile_picture ? `/userast/${user.profile_picture}` : undefined,
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
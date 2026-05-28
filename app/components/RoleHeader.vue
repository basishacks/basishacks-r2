<template>

<UHeader>
      <template #title>
        <span class="text-primary">basishacks_2026</span>
      </template>

      <UNavigationMenu :items="navItems" />

      <template #right>
        <UButton
          icon="i-lucide-menu"
          variant="ghost"
          class="lg:hidden"
          @click="emit('toggleDrawer')"
        />
        <UColorModeButton />
        <UButton
          variant="ghost"
          :class="profileIconColor"
          href="/profile"
        >
          <template v-if="userRef">
            <UserAvatar :user="user" size="sm" />
          </template>
          <UIcon v-else name="i-material-symbols-account-circle-full" class="text-xl" />
        </UButton>
      </template>

      <template #body>
        <UNavigationMenu
          :items="navItems"
          orientation="vertical"
          class="-mx-2.5"
        />
      </template>
    </UHeader>

    </template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { hasPermission } from '~~/shared/permissions'

const emit = defineEmits<{
  toggleDrawer: []
}>()

const { user: userRef } = useUserSession()
// this is honestly ugly asf but i can't think of a clean solution
const { data: user } = useFetch<GetUserResponse>(
  () => `/api/users/${userRef.value?.id}`,
  { lazy: true }
)
const { data: hackathon } = useFetch('/api/hackathon', { lazy: true })

const profileIconColor = computed(() => {
  return userRef.value ? 'text-primary' : 'text-ui-muted'
})


const dashboardContent: NavigationMenuItem[] = [
        
   

        {
          label: 'Overview',
          icon: 'i-lucide-info',
          to: '/dashboard'
    },


    {
          label: 'General',
          icon: 'i-lucide-file-text',
          to: '/dashboard/general'
    },

    {
          label: 'Teams',
          icon: 'i-fluent-people-team-16-filled',
          to: '/dashboard/teams'
    },

    {
          label: 'Presentation',
          icon: 'i-material-symbols-present-to-all',
          to: '/dashboard/presentation',
          chip: true
    },
    
   
  ]




const navItems = computed<NavigationMenuItem[]>(() => {
  const links = [
    {
      label: 'Home',
      to: '/',
      icon: 'i-material-symbols-home-outline',
      
    },
    {
      label: 'Dashboard',
      to: '/dashboard',
      icon: 'i-material-symbols-space-dashboard',
      children: dashboardContent,
      
    },
  ]
  if (
    (hasPermission(user.value?.role, 'judge') || hasPermission(user.value?.role, 'admin')) &&
    hackathon.value?.status === 'voting'
  ) {
    links.push({
      label: 'Judging',
      to: '/judging',
      icon: 'i-material-symbols-gavel',
    })
  }
  if (
    hasPermission(user.value?.role, 'participant') &&
    user.value?.team_id &&
    hackathon.value?.status === 'voting'
  ) {
    links.push({
      label: 'Voting',
      to: '/voting',
      icon: 'i-material-symbols-ballot',
    })
  }
  if (hackathon.value?.status === 'finished') {
    links.push({
      label: 'Results',
      to: '/results',
      icon: 'i-material-symbols-flag',
    })
  }
  return links
})</script>
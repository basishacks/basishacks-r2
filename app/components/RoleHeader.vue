<template>

<UHeader>
      <template #title>
        <span class="text-primary">basishacks_2026</span>
      </template>

      <UNavigationMenu :items="navItems" />

      <template #right>
        <UColorModeButton />
        <UButton
          icon="i-material-symbols-account-circle-full"
          variant="ghost"
          :class="profileIconColor"
          href="/profile"
        />
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

const { user: userRef } = useUserSession()
// this is honestly ugly asf but i can't think of a clean solution
const { data: user } = await useFetch<GetUserResponse>(
  () => `/api/users/${userRef.value?.id}`,
)
const { data: hackathon } = await useFetch('/api/hackathon')

const profileIconColor = computed(() => {
  return userRef.value ? 'text-primary' : 'text-ui-muted'
})

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
      
    },
  ]
  if (
    (user.value?.role === 'judge' || user.value?.role === 'admin') &&
    hackathon.value?.status === 'voting'
  ) {
    links.push({
      label: 'Judging',
      to: '/judging',
      icon: 'i-material-symbols-gavel',
    })
  }
  if (
    user.value?.role === 'participant' &&
    user.value.team_id &&
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
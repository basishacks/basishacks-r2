<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const dashboardContent: NavigationMenuItem[] = [
        
    {
      label: 'Guide',
      icon: 'i-lucide-book-open',
      children: [
        {
          label: 'Introduction',
          description: 'Fully styled and customizable components for Nuxt.',
          icon: 'i-lucide-house'
        },
        {
          label: 'Installation',
          description: 'Learn how to install and configure Nuxt UI in your application.',
          icon: 'i-lucide-cloud-download'
        },
        {
          label: 'Icons',
          icon: 'i-lucide-smile',
          description: 'You have nothing to do, @nuxt/icon will handle it automatically.'
        },
        {
          label: 'Colors',
          icon: 'i-lucide-swatch-book',
          description: 'Choose a primary and a neutral color from your Tailwind CSS theme.'
        },
        {
          label: 'Theme',
          icon: 'i-lucide-cog',
          description: 'You can customize components by using the `class` / `ui` props or in your app.config.ts.'
        }
      ]
    },

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
          icon: 'i-majesticons-presentation-play',
          to: '/dashboard/presentation',
          chip: true
    },
    
   
  ]

definePageMeta({
  layout: 'dashboard',
})

const dashboardItems = ref<NavigationMenuItem[][]>([
  [
  {
      label: 'Dashboard',
      type: 'label'
  },
    ...dashboardContent
  ],
  [
    {
      label: 'Help',
      icon: 'i-lucide-circle-help',
      to: "https://teams.microsoft.com/l/channel/19%3Ae352153b90524d81b9f9b50c7dd84d12%40thread.tacv2/QnA?groupId=b207a655-d801-4200-8345-5dcc50d6d957&tenantId=cbc6e1e2-a6bb-4002-bbdc-6da892a051a7",
      target: '_blank'
    }
  ]
])
</script>

<template>
  <!-- <div class="flex flex-row items-start justify-start">
    <UNavigationMenu class="pl-16 pr-4 border-r border-default h-full h-100vh" orientation="vertical" :items="items" />
    <div class="bg-white-100 p-64"></div>
  </div> -->

  <RoleHeader></RoleHeader>

  


  <UContainer class="flex flex-col gap-0">
    <div class="panel fixed -translate-x-full -mx-12 ">
      <div class="mt-12"></div>
      <UCard>
        <template #header>
          <span class="uppercase text-sm font-bold text-muted">ongoing</span>
          <h3 class="text-2xl bold glow ">June 2026</h3>
          <span class="metallic-gold uppercase bold">#{{ THEME_NAME }}</span>
          <USeparator class="my-4" size="sm"></USeparator>
          <ULink class="text-xs" href="/theme/june2026">See event details <UIcon name="i-lucide-arrow-right"></UIcon></ULink>
        </template>
      </UCard>
      <UNavigationMenu orientation="vertical" :items="dashboardItems" class="data-[orientation=vertical]:w-48 mt-12" />
    </div>

    <UBanner color="neutral" id="hoverdashnotif" class="z-0 mt-4 nopanel text-xs text-muted rounded-md"
    title="You can also hover over the dashboard tag to see more options"
    close></UBanner>
    
    <slot />
  </UContainer>

  
</template>

<style scoped>
.metallic-gold {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 25%, #FFD700 50%, #FFA500 75%, #FFD700 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
  animation: shimmer 3s ease-in-out infinite;
}

.metallic-silver {
  background: linear-gradient(135deg, #E8E8E8 0%, #C0C0C0 25%, #E8E8E8 50%, #C0C0C0 75%, #E8E8E8 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
  animation: shimmer 3s ease-in-out infinite;
}

.metallic-bronze {
  background: linear-gradient(135deg, #CD7F32 0%, #B87333 25%, #df9953 50%, #B87333 75%, #CD7F32 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
  animation: shimmer 3s ease-in-out infinite;
}

.panel {
  @media (width <= 1780px) {
    display: none;
  }
}

.nopanel {
  @media (width > 1780px) {
    display: none;
  }
}

@keyframes shimmer {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
</style>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';

const items = ref<NavigationMenuItem[][]>([
  [
    {
      label: 'Dashboard',
      type: 'label',
    },

    {
      label: 'Guide',
      icon: 'i-lucide-book-open',
      children: [
        {
          label: 'Introduction',
          description: 'Fully styled and customizable components for Nuxt.',
          icon: 'i-lucide-house',
        },
        {
          label: 'Installation',
          description: 'Learn how to install and configure Nuxt UI in your application.',
          icon: 'i-lucide-cloud-download',
        },
        {
          label: 'Icons',
          icon: 'i-lucide-smile',
          description: 'You have nothing to do, @nuxt/icon will handle it automatically.',
        },
        {
          label: 'Colors',
          icon: 'i-lucide-swatch-book',
          description: 'Choose a primary and a neutral color from your Tailwind CSS theme.',
        },
        {
          label: 'Theme',
          icon: 'i-lucide-cog',
          description:
            'You can customize components by using the `class` / `ui` props or in your app.config.ts.',
        },
      ],
    },

    {
      label: 'Overview',
      icon: 'i-lucide-info',
      to: '/dashboard',
    },

    {
      label: 'General',
      icon: 'i-lucide-file-text',
      to: '/dashboard/general',
    },

    {
      label: 'Teams',
      icon: 'i-fluent-people-team-16-filled',
      to: '/dashboard/teams',
    },

    {
      label: 'Presentation',
      icon: 'i-lucide-presentation',
      to: '/dashboard/presentation',
      chip: true,
    },
  ],
  [
    {
      label: 'Help',
      icon: 'i-lucide-circle-help',
      to: 'https://teams.microsoft.com/l/channel/19%3Ae352153b90524d81b9f9b50c7dd84d12%40thread.tacv2/QnA?groupId=b207a655-d801-4200-8345-5dcc50d6d957&tenantId=cbc6e1e2-a6bb-4002-bbdc-6da892a051a7',
      target: '_blank',
    },
  ],
]);
</script>

<template>
  <!-- <div class="flex flex-row items-start justify-start">
    <UNavigationMenu class="pl-16 pr-4 border-r border-default h-full h-100vh" orientation="vertical" :items="items" />
    <div class="bg-white-100 p-64"></div>
  </div> -->

  <div>
    <RoleHeader />

    <UContainer class="flex flex-col">
      <div class="hide-small fixed -translate-x-full -mx-12">
        <div class="mt-12" />
        <UCard>
          <template #header>
            <span class="uppercase text-sm font-bold text-muted">ongoing</span>
            <h3 class="text-2xl bold glow">June 2026</h3>
            <span class="metallic-gold uppercase bold">#{{ THEME_NAME }}</span>
            <USeparator class="my-4" size="sm" />
            <ULink class="text-xs" href="/theme/june-2026">
              See event details
              <UIcon name="i-lucide-arrow-right" />
            </ULink>
          </template>
        </UCard>
        <UNavigationMenu
          orientation="vertical"
          :items="items"
          class="data-[orientation=vertical]:w-48 mt-12"
        />
      </div>

      <UBanner
        id="hoverdashnotif"
        color="neutral"
        class="z-0 mt-4 nopanel text-xs text-muted rounded-md show-small"
        title="You can also expand the dashboard tab to see more options"
        close
      />

      <div class="mt-12">
        <slot />
      </div>
    </UContainer>
  </div>
</template>

<style scoped>
.metallic-gold {
  background: linear-gradient(
    135deg,
    #ffd700 0%,
    #ffa500 25%,
    #ffd700 50%,
    #ffa500 75%,
    #ffd700 100%
  );
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
  animation: shimmer 3s ease-in-out infinite;
}

.metallic-silver {
  background: linear-gradient(
    135deg,
    #e8e8e8 0%,
    #c0c0c0 25%,
    #e8e8e8 50%,
    #c0c0c0 75%,
    #e8e8e8 100%
  );
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
  animation: shimmer 3s ease-in-out infinite;
}

.metallic-bronze {
  background: linear-gradient(
    135deg,
    #cd7f32 0%,
    #b87333 25%,
    #df9953 50%,
    #b87333 75%,
    #cd7f32 100%
  );
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
  animation: shimmer 3s ease-in-out infinite;
}

@keyframes shimmer {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 50% 100%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.hide-small {
  @media (width < 1800px) {
    display: none;
  }
}

.show-small {
  @media (width >= 1800px) {
    display: none;
  }
}
</style>

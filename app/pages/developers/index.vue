<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';

definePageMeta({
  layout: 'developers-dashboard',
});
</script>

<template>
  <div class="m-8 mt-16">
    <h1 class="text-2xl bold">Welcome back!</h1>
    <br />
    <p>
      This is the official portal of the
      <span class="text-primary">{{ WEBSITE_NAME }} developer portal</span>
      .
    </p>
  </div>
</template>

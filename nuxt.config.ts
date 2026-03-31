// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    'nitro-cloudflare-dev',
    '@nuxt/eslint',
    '@nuxt/ui',
    'nuxt-auth-utils',
  ],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    sendCodeURL: '',
    session: {
      password: '',
      maxAge: 30 * 24 * 60 * 60,
    },
  },
  colorMode: {
    preference: 'dark',
  },
  experimental: {
    asyncContext: true,
  },
  devServer: {
    port: 24598,
  },
  fonts: {
    provider: 'local',
  },
  vite: {
    server: {
      allowedHosts: true,
    },
  },
  nitro: {
    preset: 'node-server',
  },
})

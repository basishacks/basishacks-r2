// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false }, // keeps crasing
  modules: ['@nuxt/eslint', '@nuxt/ui', 'nuxt-auth-utils', '@comark/nuxt'],
  
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
  routeRules: {
    '/rules': { swr: 3600 },
    '/showcase': { swr: 600 },
    '/': { swr: 300 },
    '/developers/**': { ssr: false },
    '/api/**': { headers: { 'cache-control': 's-maxage=60' } },
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
    optimizeDeps: {
      include: ['@comark/vue'],
    },
    build: {
      target: 'es2020',
      minify: 'esbuild',
      sourcemap: false,
      rollupOptions: {
        onwarn(warning, warn) {
          if (warning.message.includes('Sourcemap is likely to be incorrect')) return
          if (warning.code === 'TOLERATED_TRANSFORM') return
          if (warning.code === 'PLUGIN_TIMINGS') return
          if (warning.code === 'CIRCULAR_DEPENDENCY') return
          if (warning.message.includes('/* #__PURE__ */')) return
          warn(warning)
        }
      }
    }
  },
  nitro: {
    preset: 'bun',
    externals: {
      trace: false
    },
    rollupConfig: {
      onwarn(warning, warn) {
        if (warning.code === 'UNRESOLVED_IMPORT') return
        if (warning.code === 'CIRCULAR_DEPENDENCY') return
        if (warning.code === 'PLUGIN_TIMINGS') return
        if (warning.message.includes('/* #__PURE__ */')) return
        warn(warning)
      }
    }
  }
})
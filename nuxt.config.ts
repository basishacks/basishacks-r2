// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
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
    port: 3001,
  },
  icon: {
    customCollections: [],
  },
  fonts: {
    provider: 'local',
  },
  vite: {
    server: {
      allowedHosts: true,
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
      // trace: true
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
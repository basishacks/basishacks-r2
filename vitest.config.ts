import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Only pick up test files matching this pattern
    include: ['tests/**/*.test.ts'],
    // Expose test helpers (describe, it, expect, etc.) globally
    globals: true,
    // Run tests in a Node.js environment
    environment: 'node',
    // Setup file that runs before every test suite
    setupFiles: ['tests/setup.ts'],
  },
  resolve: {
    alias: {
      // Nuxt-style project root aliases so tests can use ~~/ and ~/
      '~~': fileURLToPath(new URL('.', import.meta.url)),
      '~~/': fileURLToPath(new URL('./', import.meta.url)),
      '~': fileURLToPath(new URL('.', import.meta.url)),
      '~/': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
})
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

const rootDir = resolve(fileURLToPath(new URL(".", import.meta.url))).replace(/\\/g, "/");

export default defineConfig({
    test: {
        // Only pick up test files matching this pattern
        include: ["tests/**/*.test.ts"],
        // Expose test helpers (describe, it, expect, etc.) globally
        globals: true,
        // Run tests in a Node.js environment
        environment: "node",
        // Setup file that runs before every test suite
        setupFiles: ["tests/setup.ts"],
        coverage: {
            provider: "v8",
            exclude: [
                "nuxt.config.ts",
                "tests/**/helpers.ts",
                "bun-shim/**",
                "drizzle/**",
                "sql/archive/**",
                "documentation/**",
                "**/*.d.ts",
                "**/node_modules/**",
            ],
        },
    },
    resolve: {
        alias: {
            // Nuxt-style project root aliases so tests can use ~~/ and ~/
            "~~/": `${rootDir}/`,
            "~~": rootDir,
            "~/": `${rootDir}/`,
            "~": rootDir,
        },
    },
});

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: "2025-07-15",
    devtools: { enabled: false }, // keeps crasing
    modules: ["@nuxt/eslint", "@nuxt/ui", "nuxt-auth-utils", "@comark/nuxt"],

    css: ["~/assets/css/main.css"],
    runtimeConfig: {
        session: {
            password: "",
            maxAge: 30 * 24 * 60 * 60,
            cookie: {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
            },
        },
    },
    colorMode: {
        preference: "dark",
    },
    experimental: {
        asyncContext: true,
    },
    devServer: {
        port: 24598,
    },
    icon: {
        clientBundle: {
            scan: true,
        },
    },
    fonts: {
        provider: "local",
        defaults: {
            display: "swap",
            preload: true,
        },
        processCSSVariables: true,
        families: [
            { name: "Unbounded", src: "/fonts/unbounded-800.woff2", weight: 800 },
            { name: "Orbitron", src: "/fonts/orbitron-700.woff2", weight: 700 },
            { name: "Silkscreen", src: "/fonts/silkscreen-700.woff2", weight: 700 },
            { name: "Creepster", src: "/fonts/creepster-400.woff2", weight: 400 },
            { name: "Space Mono", src: "/fonts/space-mono-700.woff2", weight: 700 },
            {
                name: "Cormorant Garamond",
                src: "/fonts/cormorant-garamond-600.woff2",
                weight: 600,
            },
            { name: "Chakra Petch", src: "/fonts/chakra-petch-700.woff2", weight: 700 },
        ],
    },
    routeRules: {
        "/_nuxt/**": {
            headers: { "Cache-Control": "public, max-age=31536000, immutable" },
        },
        "/assets/**": {
            headers: { "Cache-Control": "public, max-age=31536000, immutable" },
        },
        "/fonts/**": {
            headers: { "Cache-Control": "public, max-age=31536000, immutable" },
        },
    },
    vite: {
        server: {
            allowedHosts: true,
        },
        optimizeDeps: {
            include: ["@comark/vue"],
        },
        build: {
            // Kept at es2020: the project currently builds reliably with this
            // target, and both Node.js >= v24 and Bun support it without issue.
            target: "es2020",
            minify: "esbuild",
            sourcemap: true,
            rollupOptions: {
                onwarn(warning, warn) {
                    if (warning.message.includes("Sourcemap is likely to be incorrect")) return;
                    if (warning.code === "TOLERATED_TRANSFORM") return;
                    if (warning.code === "PLUGIN_TIMINGS") return;
                    if (warning.code === "CIRCULAR_DEPENDENCY") return;
                    if (warning.message.includes("/* #__PURE__ */")) return;
                    warn(warning);
                },
            },
        },
    },
    nitro: {
        // Bun dev uses the bun preset implicitly; production defaults to node-server
        // so the same build runs under Node.js (better-sqlite3) or Bun (bun:sqlite).
        preset: process.env.NITRO_PRESET ?? "node-server",
        compressPublicAssets: true,
        // Reject request bodies larger than 10 MiB before buffering into memory.
        maxRequestSize: 10 * 1024 * 1024,
        externals: {
            // Node's production export condition needs Vue's production CJS
            // files, which Nitro's tracer currently omits in dev bundles.
            trace: false,
        },
        rollupConfig: {
            onwarn(warning, warn) {
                if (warning.code === "UNRESOLVED_IMPORT") return;
                if (warning.code === "CIRCULAR_DEPENDENCY") return;
                if (warning.code === "PLUGIN_TIMINGS") return;
                if (warning.message.includes("/* #__PURE__ */")) return;
                warn(warning);
            },
        },
    },
});

---
title: Production Performance Defaults
description: Static asset compression, caching, and font loading optimizations configured for production builds.
---

# Production Performance Defaults

Production builds of basishacks ship with a set of performance defaults in `nuxt.config.ts`. These are applied automatically by Nitro and `@nuxt/fonts`; no extra environment variables are required.

## Static asset compression

Nitro is configured to pre-compress public assets:

```ts
nitro: {
    compressPublicAssets: true,
}
```

This generates gzip and brotli versions of eligible static files so the Node/Bun server can serve compressed responses without runtime overhead.

## Long-lived cache headers

`routeRules` attach immutable cache headers to versioned/hashed static asset paths:

```ts
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
}
```

- `/_nuxt/**` covers hashed Nuxt build chunks.
- `/assets/**` covers user-uploaded and static assets under `public/assets`.
- `/fonts/**` covers the Monaspace Neon font files.

::: tip These paths are assumed to contain hashed or versioned filenames. If you add mutable files under `/assets/` or `/fonts/`, either use a hash in the filename or lower the cache time for that path. :::

## Font loading

The critical Monaspace Neon font is preloaded in `app/app.vue`:

```ts
useHead({
    link: [
        {
            rel: "preload",
            href: "/fonts/Monaspace-Neon.woff2",
            as: "font",
            type: "font/woff2",
            crossorigin: "anonymous",
        },
    ],
});
```

`@nuxt/fonts` is configured to apply `font-display: swap` and preload discovered fonts:

```ts
fonts: {
    provider: "local",
    defaults: {
        display: "swap",
        preload: true,
    },
    processCSSVariables: true,
}
```

`display: "swap"` ensures text remains visible with a fallback font while Monaspace Neon loads.

## Build target

`vite.build.target` is kept at `es2020`:

```ts
vite: {
    build: {
        target: "es2020",
    },
}
```

Node.js >= v24 and Bun both support `es2020` without issue. The target can be re-evaluated to `es2022` or later once the project is confirmed to build cleanly with a newer target.

## Verification

A configuration test in `tests/nuxt-config.test.ts` asserts that the performance defaults are present in `nuxt.config.ts`. Run it with:

```bash
bun run test tests/nuxt-config.test.ts
```

For a full production smoke test, build the app:

```bash
bun run build
```

and then start the server with `bun start` or `node .output/server/index.mjs`.

import { describe, it, expect, beforeAll } from "vitest";

let config: Record<string, any>;

beforeAll(async () => {
    // defineNuxtConfig is an auto-import inside the Nuxt CLI; stub it as the
    // identity function so we can import and inspect nuxt.config.ts in Vitest.
    (globalThis as any).defineNuxtConfig = (cfg: Record<string, any>) => cfg;
    config = (await import("~~/nuxt.config")).default;
});

describe("nuxt production performance defaults", () => {
    it("enables Nitro public asset compression", () => {
        expect(config.nitro).toBeDefined();
        expect(config.nitro?.compressPublicAssets).toBe(true);
    });

    it("sets long-lived cache headers on static assets", () => {
        expect(config.routeRules).toBeDefined();
        const oneYear = "public, max-age=31536000, immutable";
        expect(config.routeRules?.["/_nuxt/**"].headers?.["Cache-Control"]).toBe(oneYear);
        expect(config.routeRules?.["/assets/**"].headers?.["Cache-Control"]).toBe(oneYear);
        expect(config.routeRules?.["/fonts/**"].headers?.["Cache-Control"]).toBe(oneYear);
    });

    it("uses a stable build target for the supported runtimes", () => {
        // es2020 is kept because the project builds reliably with it; both
        // Node.js >= v24 and Bun fully support it.
        expect(config.vite?.build?.target).toBe("es2020");
    });

    it("configures @nuxt/fonts with display swap and preload", () => {
        expect(config.fonts?.defaults?.display).toBe("swap");
        expect(config.fonts?.defaults?.preload).toBe(true);
        expect(config.fonts?.processCSSVariables).toBe(true);
    });
});

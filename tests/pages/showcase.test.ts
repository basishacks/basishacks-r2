import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const pagesDirectory = resolve(import.meta.dirname, "..", "..", "app", "pages", "showcase");
const indexSource = readFileSync(resolve(pagesDirectory, "index.vue"), "utf-8");

describe("showcase routes", () => {
    it("keeps each season showcase under /showcase", () => {
        expect(existsSync(resolve(pagesDirectory, "beneath-the-surface.vue"))).toBe(true);
        expect(existsSync(resolve(pagesDirectory, "signal.vue"))).toBe(true);
    });

    it("features Beneath the Surface before Signal on the showcase index", () => {
        const featuredPosition = indexSource.indexOf('to="/showcase/beneath-the-surface"');
        const previousPosition = indexSource.indexOf('to="/showcase/signal"');

        expect(featuredPosition).toBeGreaterThan(-1);
        expect(previousPosition).toBeGreaterThan(featuredPosition);
    });

    it("links to both season showcase routes", () => {
        expect(indexSource).toContain('to="/showcase/beneath-the-surface"');
        expect(indexSource).toContain('to="/showcase/signal"');
    });
});

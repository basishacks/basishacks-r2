import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
    resolve(import.meta.dirname, "..", "..", "app", "components", "SafeComark.vue"),
    "utf-8",
);

describe("SafeComark.vue", () => {
    it("imports the safe link renderer used by its component map", () => {
        expect(source).toContain('import SafeLink from "~/components/SafeLink.vue"');
        expect(source).toContain("const safeComponents = { a: SafeLink }");
    });

    it("passes its slot text through Comark's markdown prop", () => {
        expect(source).toContain("const markdown = computed");
        expect(source).toContain('<Comark :markdown="markdown"');
    });
});

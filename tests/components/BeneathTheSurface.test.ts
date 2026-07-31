import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
    resolve(
        import.meta.dirname,
        "..",
        "..",
        "app",
        "components",
        "showcase",
        "BeneathTheSurface.vue",
    ),
    "utf-8",
);

describe("BeneathTheSurface.vue", () => {
    it("freezes the six Season 1 winners in pathway and rank order", () => {
        const winnerIds = [...source.matchAll(/^\s{8}id: (\d+),$/gm)].map((match) =>
            Number(match[1]),
        );

        expect(winnerIds).toEqual([50, 12, 49, 9, 47, 25]);
        expect(source).toContain('"/api/teams?season_id=1"');
    });

    it("renders one full-page project section for every configured winner", () => {
        expect(source).toContain('v-for="winner in winners"');
        expect(source).toContain("data-project-section");
        expect(source).toContain("min-height: 100svh");
        expect(source.match(/theme: "(rainbow|land|forest|metadata|unseen|trace)"/g)).toHaveLength(
            6,
        );
    });

    it("does not regress to the old global top-four gallery", () => {
        expect(source).not.toContain("featuredTeams");
        expect(source).not.toContain("slice(0, 4)");
        expect(source).not.toContain("<UMarquee");
        expect(source).not.toContain("team.score");
    });

    it("loads and cleans up responsive GSAP animations", () => {
        expect(source).toContain('import("gsap")');
        expect(source).toContain('import("gsap/ScrollTrigger")');
        expect(source).toContain("gsap.matchMedia()");
        expect(source).toContain("media?.revert()");
        expect(source).toContain("(prefers-reduced-motion: reduce)");
    });
});

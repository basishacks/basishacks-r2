import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
    resolve(import.meta.dirname, "..", "..", "app", "components", "ProjectCard.vue"),
    "utf-8",
);

describe("ProjectCard.vue regressions", () => {
    it("binds the team name to the description prop", () => {
        expect(source).not.toContain("description=teamname");
        expect(source).toContain(':description="team.name"');
    });

    it("renders the no-team-name fallback with valid markup", () => {
        expect(source).not.toMatch(/text-muted text-sm\(No Team Name\)/);
        expect(source).toContain('<span v-else class="text-muted text-sm">(No Team Name)</span>');
    });

    it("disables the Demo button based on the demo URL", () => {
        expect(source).toContain(':disabled="!team.project.demo_url"');
    });
});

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const teamFormSource = readFileSync(
    resolve(import.meta.dirname, "..", "..", "app", "components", "TeamForm.vue"),
    "utf-8",
);
const dashboardSource = readFileSync(
    resolve(import.meta.dirname, "..", "..", "app", "pages", "dashboard", "index.vue"),
    "utf-8",
);

describe("debug artifact cleanup", () => {
    it("removes TeamForm debug console.log and if(true) guard", () => {
        expect(teamFormSource).not.toContain("console.log(1)");
        expect(teamFormSource).not.toContain("if (true)");
    });

    it("removes dashboard index console.log of team data", () => {
        expect(dashboardSource).not.toContain("console.log(teamData.value)");
    });
});

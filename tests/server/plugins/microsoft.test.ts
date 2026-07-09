import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
    resolve(import.meta.dirname, "..", "..", "..", "server", "plugins", "microsoft.ts"),
    "utf-8",
);

describe("microsoft plugin", () => {
    it("does not create an uncleaned refresh interval", () => {
        // Any scheduled interval should be paired with a clearInterval on process close.
        // Currently the plugin refreshes only via lifecycle webhooks, so there is no interval.
        expect(source).not.toContain("setInterval");
    });
});

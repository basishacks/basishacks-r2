import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import initializeMSAccessToken, {
    initializeDummyUserAccessToken,
} from "~~/server/plugins/microsoft";

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

describe("microsoft token init network failures", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        process.env.MICROSOFT_TENANT_ID = "tenant";
        process.env.MICROSOFT_CLIENT_ID = "client";
        vi.spyOn(console, "warn").mockImplementation(() => undefined);
        vi.spyOn(console, "log").mockImplementation(() => undefined);
        vi.spyOn(console, "error").mockImplementation(() => undefined);
    });

    it("initializeMSAccessToken resolves null (never rejects) when fetch fails", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

        await expect(initializeMSAccessToken()).resolves.toBeNull();
        expect(console.warn).not.toHaveBeenCalled();
        expect(console.error).not.toHaveBeenCalled();
    });

    it("initializeMSAccessToken resolves null with one warning on non-200", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 500, json: async () => ({}) }));

        await expect(initializeMSAccessToken()).resolves.toBeNull();
        expect(console.warn).toHaveBeenCalledOnce();
    });

    it("initializeDummyUserAccessToken resolves null (never rejects) when fetch fails", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

        await expect(initializeDummyUserAccessToken()).resolves.toBeNull();
        expect(console.warn).not.toHaveBeenCalled();
        expect(console.error).not.toHaveBeenCalled();
    });
});

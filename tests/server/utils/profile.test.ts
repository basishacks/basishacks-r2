import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock jdenticon so no real PNG rendering happens
vi.mock("jdenticon", () => ({
    default: {
        toPng: vi.fn().mockReturnValue(Buffer.from("fake-png")),
    },
}));

import jdenticon from "jdenticon";
import { generateIdenticonPNG } from "~~/server/utils/profile";

// createAsset is a Nitro auto-import in profile.ts; provide a mock global.
const createAssetMock = vi.fn().mockResolvedValue("sanitized.png");

beforeEach(() => {
    createAssetMock.mockClear();
    vi.stubGlobal("createAsset", createAssetMock);
    vi.mocked(jdenticon.toPng).mockClear();
});

describe("generateIdenticonPNG", () => {
    it("replaces @ in email-like names with an underscore", async () => {
        await generateIdenticonPNG("user@basischina.com", 100);

        expect(createAssetMock).toHaveBeenCalledWith(
            "users/user_basischina.com.png",
            expect.any(Buffer),
        );
    });

    it("replaces multiple special characters with underscores", async () => {
        await generateIdenticonPNG("a@b#c$d e!", 100);

        expect(createAssetMock).toHaveBeenCalledWith("users/a_b_c_d_e_.png", expect.any(Buffer));
    });

    it("preserves alphanumerics, dots, hyphens, and underscores", async () => {
        await generateIdenticonPNG("John.Doe_123-456", 100);

        expect(createAssetMock).toHaveBeenCalledWith(
            "users/John.Doe_123-456.png",
            expect.any(Buffer),
        );
    });

    it("prefixes the sanitized name with users/ and appends .png", async () => {
        await generateIdenticonPNG("alice", 100);

        expect(createAssetMock).toHaveBeenCalledTimes(1);
        expect(createAssetMock).toHaveBeenCalledWith("users/alice.png", expect.any(Buffer));
    });

    it("returns the PNG buffer produced by jdenticon", async () => {
        const result = await generateIdenticonPNG("bob", 100);

        expect(result).toEqual(Buffer.from("fake-png"));
    });

    it("passes the raw name and size to jdenticon.toPng", async () => {
        await generateIdenticonPNG("Alice", 200);

        expect(jdenticon.toPng).toHaveBeenCalledWith("Alice", 200);
    });

    it("handles empty string name", async () => {
        await generateIdenticonPNG("", 100);

        expect(createAssetMock).toHaveBeenCalledWith("users/.png", expect.any(Buffer));
    });

    it("handles very long name", async () => {
        const longName = "x".repeat(500);
        await generateIdenticonPNG(longName, 100);

        expect(createAssetMock).toHaveBeenCalledWith(`users/${longName}.png`, expect.any(Buffer));
    });

    it("handles name with only special characters", async () => {
        await generateIdenticonPNG("@#$%^&*", 100);

        expect(createAssetMock).toHaveBeenCalledWith("users/_______.png", expect.any(Buffer));
    });

    it("handles name with unicode characters", async () => {
        await generateIdenticonPNG("名前テスト", 100);

        expect(createAssetMock).toHaveBeenCalledWith("users/_____.png", expect.any(Buffer));
    });

    it("handles size = 0", async () => {
        await generateIdenticonPNG("edge", 0);

        expect(jdenticon.toPng).toHaveBeenCalledWith("edge", 0);
        expect(createAssetMock).toHaveBeenCalledWith("users/edge.png", expect.any(Buffer));
    });

    it("handles very large size", async () => {
        await generateIdenticonPNG("large", 10000);

        expect(jdenticon.toPng).toHaveBeenCalledWith("large", 10000);
        expect(createAssetMock).toHaveBeenCalledWith("users/large.png", expect.any(Buffer));
    });

    it("propagates error when jdenticon.toPng throws", async () => {
        vi.mocked(jdenticon.toPng).mockImplementationOnce(() => {
            throw new Error("png generation failed");
        });

        await expect(generateIdenticonPNG("crash", 100)).rejects.toThrow("png generation failed");
    });

    it("propagates error when createAsset throws", async () => {
        createAssetMock.mockRejectedValueOnce(new Error("asset storage failed"));

        await expect(generateIdenticonPNG("storefail", 100)).rejects.toThrow(
            "asset storage failed",
        );
    });

    it("handles multiple sequential calls with same name", async () => {
        await generateIdenticonPNG("multi", 100);
        await generateIdenticonPNG("multi", 100);
        await generateIdenticonPNG("multi", 100);

        expect(createAssetMock).toHaveBeenCalledTimes(3);
        expect(jdenticon.toPng).toHaveBeenCalledTimes(3);
    });

    it("handles multiple sequential calls with different names", async () => {
        await generateIdenticonPNG("alpha", 100);
        await generateIdenticonPNG("beta", 100);
        await generateIdenticonPNG("gamma", 100);

        expect(createAssetMock).toHaveBeenCalledWith("users/alpha.png", expect.any(Buffer));
        expect(createAssetMock).toHaveBeenCalledWith("users/beta.png", expect.any(Buffer));
        expect(createAssetMock).toHaveBeenCalledWith("users/gamma.png", expect.any(Buffer));
    });

    it("sanitizes name with leading and trailing spaces", async () => {
        await generateIdenticonPNG("  spaced  ", 100);

        expect(createAssetMock).toHaveBeenCalledWith("users/__spaced__.png", expect.any(Buffer));
    });

    it("sanitizes name that is only spaces to all underscores", async () => {
        await generateIdenticonPNG("   ", 100);

        expect(createAssetMock).toHaveBeenCalledWith("users/___.png", expect.any(Buffer));
    });

    it("sanitizes name with consecutive special characters", async () => {
        await generateIdenticonPNG("a!!b@@c##d", 100);

        expect(createAssetMock).toHaveBeenCalledWith("users/a__b__c__d.png", expect.any(Buffer));
    });

    it("preserves name with only underscores", async () => {
        await generateIdenticonPNG("___", 100);

        expect(createAssetMock).toHaveBeenCalledWith("users/___.png", expect.any(Buffer));
    });

    it("uses default size when not passed", async () => {
        await generateIdenticonPNG("default");

        expect(jdenticon.toPng).toHaveBeenCalledWith("default", 100);
    });

    it("handles name starting with a dot", async () => {
        await generateIdenticonPNG(".hidden", 100);

        expect(createAssetMock).toHaveBeenCalledWith("users/.hidden.png", expect.any(Buffer));
    });

    it("returns the same buffer from jdenticon", async () => {
        const pngBuffer = Buffer.from("fake-png");
        vi.mocked(jdenticon.toPng).mockReturnValueOnce(pngBuffer);

        const result = await generateIdenticonPNG("bob", 100);

        expect(result).toBe(pngBuffer);
    });

    it("passes raw name (before sanitization) to jdenticon", async () => {
        await generateIdenticonPNG("user@domain.com", 100);

        expect(jdenticon.toPng).toHaveBeenCalledWith("user@domain.com", 100);
    });

    it("handles name with emoji characters", async () => {
        await generateIdenticonPNG("hello🔥world", 100);

        expect(jdenticon.toPng).toHaveBeenCalledWith("hello🔥world", 100);
    });
});

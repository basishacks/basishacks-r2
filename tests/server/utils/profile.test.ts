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
});

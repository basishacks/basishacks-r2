import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import {
    createTestContext,
    resetTestContext,
    resetMockState,
    setupNitroGlobals,
    mockBody,
    mockParams,
    mockSession,
    seedHackathon,
    seedSeason,
    seedUser,
    type TestContext,
} from "../../helpers";
import { users } from "~~/server/database/schema";
import { eq } from "drizzle-orm";

vi.mock("~~/server/utils/rateLimit", () => ({
    applyRateLimit: (fn: any) => fn,
    AUTH_RATE_LIMIT_CONFIG: { maxRequests: 600, windowMs: 60 * 1000 },
}));

vi.mock("~~/server/utils/assets", () => ({
    createUserAsset: vi.fn().mockResolvedValue("test-asset.png"),
    removeUserAsset: vi.fn().mockResolvedValue(undefined),
}));

let ctx: TestContext;
let handler: any;
let createUserAsset: ReturnType<typeof vi.fn>;
let removeUserAsset: ReturnType<typeof vi.fn>;

beforeAll(async () => {
    setupNitroGlobals();

    const usersDb = await import("~~/server/utils/database/users");
    vi.stubGlobal("getUser", usersDb.getUser);
    vi.stubGlobal("updateUserName", usersDb.updateUserName);
    vi.stubGlobal("updateUserProfileTheme", usersDb.updateUserProfileTheme);
    vi.stubGlobal("updateUserProfilePicture", usersDb.updateUserProfilePicture);

    const assets = await import("~~/server/utils/assets");
    createUserAsset = assets.createUserAsset as ReturnType<typeof vi.fn>;
    removeUserAsset = assets.removeUserAsset as ReturnType<typeof vi.fn>;

    handler = (await import("~~/server/api/users/[id]/index.patch")).default;
});

beforeEach(async () => {
    resetMockState();
    ctx = await createTestContext();
    seedHackathon(ctx);
    seedSeason(ctx);
});

afterEach(() => {
    resetTestContext(ctx);
});

function createEvent(overrides: Record<string, unknown> = {}) {
    return {
        context: { drizzle: ctx.drizzle },
        ...overrides,
    };
}

const VALID_PNG_BASE64 = "data:image/png;base64,AAAA";
const VALID_JPEG_BASE64 = "data:image/jpeg;base64,AAAA";
const VALID_GIF_BASE64 = "data:image/gif;base64,AAAA";
const VALID_WEBP_BASE64 = "data:image/webp;base64,AAAA";

function tooLargeBase64(): string {
    const oversized = Buffer.alloc(10 * 1024 * 1024 + 1, 0);
    return "data:image/png;base64," + oversized.toString("base64");
}

describe("PATCH /api/users/:id", () => {
    it("returns 403 when updating another user", async () => {
        mockParams.values["id"] = "2";
        mockSession.value = { user: { id: 1 } };

        await expect(handler(createEvent())).rejects.toMatchObject({
            statusCode: 403,
            message: "Cannot update other users",
        });
    });

    it("returns 401 when authenticated user no longer exists", async () => {
        mockParams.values["id"] = "9999";
        mockSession.value = { user: { id: 9999 } };
        mockBody.value = { name: "Ghost" };

        await expect(handler(createEvent())).rejects.toMatchObject({
            statusCode: 401,
            message: "Logged in user not found",
        });
    });

    it("updates the user name", async () => {
        const alice = seedUser(ctx, { email: "alice@basischina.com", name: "Alice" });

        mockParams.values["id"] = String(alice.id);
        mockSession.value = { user: { id: alice.id } };
        mockBody.value = { name: "Alice Updated" };

        const result = await handler(createEvent());

        expect(result).toEqual({ message: "Your profile is updated" });

        const updated = ctx.drizzle.select().from(users).where(eq(users.id, alice.id)).get();
        expect(updated!.name).toBe("Alice Updated");
    });

    describe("profile_theme_image", () => {
        it("removes the existing profile theme image when null", async () => {
            const alice = seedUser(ctx, { email: "alice@basischina.com", name: "Alice" });
            ctx.drizzle
                .update(users)
                .set({ profile_theme: "url|old-theme.png" })
                .where(eq(users.id, alice.id))
                .run();

            mockParams.values["id"] = String(alice.id);
            mockSession.value = { user: { id: alice.id } };
            mockBody.value = { profile_theme_image: null };

            const result = await handler(createEvent());

            expect(result).toEqual({ message: "Your profile is updated" });
            expect(removeUserAsset).toHaveBeenCalledWith("old-theme.png");

            const updated = ctx.drizzle.select().from(users).where(eq(users.id, alice.id)).get();
            expect(updated!.profile_theme).toBeNull();
        });

        it("rejects an invalid image data URL format", async () => {
            const alice = seedUser(ctx, { email: "alice@basischina.com", name: "Alice" });

            mockParams.values["id"] = String(alice.id);
            mockSession.value = { user: { id: alice.id } };
            mockBody.value = { profile_theme_image: "not-a-data-url" };

            await expect(handler(createEvent())).rejects.toMatchObject({
                statusCode: 400,
                message: "Invalid image data format. Expected a base64 data URL.",
            });
        });

        it("rejects a data URL without a mime type", async () => {
            const alice = seedUser(ctx, { email: "alice@basischina.com", name: "Alice" });

            mockParams.values["id"] = String(alice.id);
            mockSession.value = { user: { id: alice.id } };
            mockBody.value = { profile_theme_image: "data:;base64,AAAA" };

            await expect(handler(createEvent())).rejects.toMatchObject({
                statusCode: 400,
                message: "Could not determine image type from upload data.",
            });
        });

        it("rejects invalid base64 image data", async () => {
            const alice = seedUser(ctx, { email: "alice@basischina.com", name: "Alice" });

            mockParams.values["id"] = String(alice.id);
            mockSession.value = { user: { id: alice.id } };
            mockBody.value = { profile_theme_image: "data:image/png;base64,!!!" };

            await expect(handler(createEvent())).rejects.toMatchObject({
                statusCode: 400,
                message: "Invalid base64 image data.",
            });
        });

        it("rejects an unsupported image mime type", async () => {
            const alice = seedUser(ctx, { email: "alice@basischina.com", name: "Alice" });

            mockParams.values["id"] = String(alice.id);
            mockSession.value = { user: { id: alice.id } };
            mockBody.value = { profile_theme_image: "data:application/pdf;base64,JVBERi0=" };

            await expect(handler(createEvent())).rejects.toMatchObject({
                statusCode: 400,
                message: "Invalid image type for profile theme. Only JPEG, PNG, GIF, and WebP are allowed.",
            });
        });

        it("falls back to bin extension for unknown mime types", async () => {
            const alice = seedUser(ctx, { email: "alice@basischina.com", name: "Alice" });

            mockParams.values["id"] = String(alice.id);
            mockSession.value = { user: { id: alice.id } };
            mockBody.value = { profile_theme_image: "data:application/json;base64,AAAA" };

            await expect(handler(createEvent())).rejects.toMatchObject({
                statusCode: 400,
                message: "Invalid image type for profile theme. Only JPEG, PNG, GIF, and WebP are allowed.",
            });
        });

        it("rejects a profile theme image that exceeds the maximum size", async () => {
            const alice = seedUser(ctx, { email: "alice@basischina.com", name: "Alice" });

            mockParams.values["id"] = String(alice.id);
            mockSession.value = { user: { id: alice.id } };
            mockBody.value = { profile_theme_image: tooLargeBase64() };

            await expect(handler(createEvent())).rejects.toMatchObject({
                statusCode: 413,
                message: "Profile theme image is too large. Maximum size is 10MB.",
            });
        });

        it("uploads a new profile theme image for each accepted image type", async () => {
            const testCases = [
                { dataUrl: VALID_JPEG_BASE64, ext: "jpg" },
                { dataUrl: VALID_PNG_BASE64, ext: "png" },
                { dataUrl: VALID_GIF_BASE64, ext: "gif" },
                { dataUrl: VALID_WEBP_BASE64, ext: "webp" },
            ];

            for (const { dataUrl, ext } of testCases) {
                resetMockState();
                createUserAsset.mockClear();
                removeUserAsset.mockClear();

                const alice = seedUser(ctx, {
                    email: `alice-${ext}@basischina.com`,
                    name: "Alice",
                });
                ctx.drizzle
                    .update(users)
                    .set({ profile_theme: "url|old-theme.png" })
                    .where(eq(users.id, alice.id))
                    .run();

                mockParams.values["id"] = String(alice.id);
                mockSession.value = { user: { id: alice.id } };
                mockBody.value = { profile_theme_image: dataUrl };

                const result = await handler(createEvent());

                expect(result).toEqual({ message: "Your profile is updated" });
                expect(removeUserAsset).toHaveBeenCalledWith("old-theme.png");
                expect(createUserAsset).toHaveBeenCalledWith(
                    expect.stringMatching(new RegExp(`\\.${ext}$`)),
                    expect.any(Buffer),
                );

                const updated = ctx.drizzle.select().from(users).where(eq(users.id, alice.id)).get();
                expect(updated!.profile_theme).toMatch(/^url\|test-asset\.png$/);
            }
        });
    });

    describe("avatar", () => {
        it("removes the existing avatar when null", async () => {
            const alice = seedUser(ctx, { email: "alice@basischina.com", name: "Alice" });
            ctx.drizzle
                .update(users)
                .set({ profile_picture: "old-avatar.png" })
                .where(eq(users.id, alice.id))
                .run();

            mockParams.values["id"] = String(alice.id);
            mockSession.value = { user: { id: alice.id } };
            mockBody.value = { avatar: null };

            const result = await handler(createEvent());

            expect(result).toEqual({ message: "Your profile is updated" });
            expect(removeUserAsset).toHaveBeenCalledWith("old-avatar.png");

            const updated = ctx.drizzle.select().from(users).where(eq(users.id, alice.id)).get();
            expect(updated!.profile_picture).toBeNull();
        });

        it("rejects an unsupported avatar mime type", async () => {
            const alice = seedUser(ctx, { email: "alice@basischina.com", name: "Alice" });

            mockParams.values["id"] = String(alice.id);
            mockSession.value = { user: { id: alice.id } };
            mockBody.value = { avatar: "data:application/pdf;base64,JVBERi0=" };

            await expect(handler(createEvent())).rejects.toMatchObject({
                statusCode: 400,
                message: "Invalid image type for avatar. Only JPEG, PNG, GIF, and WebP are allowed.",
            });
        });

        it("rejects an avatar that exceeds the maximum size", async () => {
            const alice = seedUser(ctx, { email: "alice@basischina.com", name: "Alice" });

            mockParams.values["id"] = String(alice.id);
            mockSession.value = { user: { id: alice.id } };
            mockBody.value = { avatar: tooLargeBase64() };

            await expect(handler(createEvent())).rejects.toMatchObject({
                statusCode: 413,
                message: "Avatar image is too large. Maximum size is 10MB.",
            });
        });

        it("uploads a new avatar for each accepted image type", async () => {
            const testCases = [
                { dataUrl: VALID_JPEG_BASE64, ext: "jpg" },
                { dataUrl: VALID_PNG_BASE64, ext: "png" },
                { dataUrl: VALID_GIF_BASE64, ext: "gif" },
                { dataUrl: VALID_WEBP_BASE64, ext: "webp" },
            ];

            for (const { dataUrl, ext } of testCases) {
                resetMockState();
                createUserAsset.mockClear();
                removeUserAsset.mockClear();

                const alice = seedUser(ctx, {
                    email: `alice-avatar-${ext}@basischina.com`,
                    name: "Alice",
                });
                ctx.drizzle
                    .update(users)
                    .set({ profile_picture: "old-avatar.png" })
                    .where(eq(users.id, alice.id))
                    .run();

                mockParams.values["id"] = String(alice.id);
                mockSession.value = { user: { id: alice.id } };
                mockBody.value = { avatar: dataUrl };

                const result = await handler(createEvent());

                expect(result).toEqual({ message: "Your profile is updated" });
                expect(removeUserAsset).toHaveBeenCalledWith("old-avatar.png");
                expect(createUserAsset).toHaveBeenCalledWith(
                    expect.stringMatching(new RegExp(`\\.${ext}$`)),
                    expect.any(Buffer),
                );

                const updated = ctx.drizzle.select().from(users).where(eq(users.id, alice.id)).get();
                expect(updated!.profile_picture).toBe("test-asset.png");
            }
        });
    });
});

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import {
    createTestContext,
    resetTestContext,
    resetMockState,
    setupNitroGlobals,
    mockBody,
    mockParams,
    seedHackathon,
    seedSeason,
    seedUser,
    type TestContext,
} from "~~/tests/api/helpers";

let ctx: TestContext;
let deleteHandler: any;

beforeAll(async () => {
    setupNitroGlobals();

    const oauthDb = await import("~~/server/utils/database/oauth2_applications");
    vi.stubGlobal("getOAuth2Application", oauthDb.getOAuth2Application);
    vi.stubGlobal("removeOAuth2ApplicationRedirectUri", oauthDb.removeOAuth2ApplicationRedirectUri);

    deleteHandler = (await import("~~/server/api/applications/[id]/redirect_uris/index.delete"))
        .default;
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

describe("DELETE /api/applications/:id/redirect_uris", () => {
    it("deletes a redirect URI as the application owner", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com" });
        const oauthDb = await import("~~/server/utils/database/oauth2_applications");
        const app = await oauthDb.createOAuth2Application(
            { context: { drizzle: ctx.drizzle } } as any,
            user.id,
            "My App",
            null,
            false,
            "third",
        );

        // Pre-add a URI
        await oauthDb.addOAuth2ApplicationRedirectUri(
            { context: { drizzle: ctx.drizzle } } as any,
            app.client_id,
            "https://example.com/callback",
        );

        vi.mocked(globalThis.requireUser).mockResolvedValue(user);
        mockParams.values = { id: app.client_id };
        mockBody.value = { uri: "https://example.com/callback" };

        const result = await deleteHandler(createEvent());

        expect(result).toEqual({ message: "Redirect URI deleted" });

        const uris = await oauthDb.getOAuth2ApplicationRedirectUris(
            { context: { drizzle: ctx.drizzle } } as any,
            app.client_id,
        );
        expect(uris).not.toContain("https://example.com/callback");
    });

    it("deletes a redirect URI as an admin", async () => {
        const owner = seedUser(ctx, { email: "owner@basischina.com" });
        const admin = seedUser(ctx, { email: "admin@basischina.com", role: "admin" });
        const oauthDb = await import("~~/server/utils/database/oauth2_applications");
        const app = await oauthDb.createOAuth2Application(
            { context: { drizzle: ctx.drizzle } } as any,
            owner.id,
            "Admin App",
            null,
            false,
            "third",
        );

        await oauthDb.addOAuth2ApplicationRedirectUri(
            { context: { drizzle: ctx.drizzle } } as any,
            app.client_id,
            "https://admin.example.com/cb",
        );

        vi.mocked(globalThis.requireUser).mockResolvedValue(admin);
        mockParams.values = { id: app.client_id };
        mockBody.value = { uri: "https://admin.example.com/cb" };

        const result = await deleteHandler(createEvent());
        expect(result).toEqual({ message: "Redirect URI deleted" });
    });

    it("deletes one of multiple redirect URIs, leaving others intact", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com" });
        const oauthDb = await import("~~/server/utils/database/oauth2_applications");
        const app = await oauthDb.createOAuth2Application(
            { context: { drizzle: ctx.drizzle } } as any,
            user.id,
            "Multi URI App",
            null,
            false,
            "third",
        );

        await oauthDb.addOAuth2ApplicationRedirectUri(
            { context: { drizzle: ctx.drizzle } } as any,
            app.client_id,
            "https://example.com/one",
        );
        await oauthDb.addOAuth2ApplicationRedirectUri(
            { context: { drizzle: ctx.drizzle } } as any,
            app.client_id,
            "https://example.com/two",
        );

        vi.mocked(globalThis.requireUser).mockResolvedValue(user);
        mockParams.values = { id: app.client_id };
        mockBody.value = { uri: "https://example.com/one" };

        const result = await deleteHandler(createEvent());
        expect(result).toEqual({ message: "Redirect URI deleted" });

        const uris = await oauthDb.getOAuth2ApplicationRedirectUris(
            { context: { drizzle: ctx.drizzle } } as any,
            app.client_id,
        );
        expect(uris).not.toContain("https://example.com/one");
        expect(uris).toContain("https://example.com/two");
    });

    it("returns 404 when the application does not exist", async () => {
        vi.mocked(globalThis.requireUser).mockResolvedValue({ id: 1, role: "participant" });
        mockParams.values = { id: "nonexistent-client-id" };
        mockBody.value = { uri: "https://example.com/callback" };

        await expect(deleteHandler(createEvent())).rejects.toMatchObject({ statusCode: 404 });
    });

    it("returns 403 when the caller is neither owner nor authorized", async () => {
        const owner = seedUser(ctx, { email: "owner@basischina.com" });
        const other = seedUser(ctx, { email: "other@basischina.com" });
        const oauthDb = await import("~~/server/utils/database/oauth2_applications");
        const app = await oauthDb.createOAuth2Application(
            { context: { drizzle: ctx.drizzle } } as any,
            owner.id,
            "Private App",
            null,
            false,
            "third",
        );

        // Pre-add a URI
        await oauthDb.addOAuth2ApplicationRedirectUri(
            { context: { drizzle: ctx.drizzle } } as any,
            app.client_id,
            "https://example.com/callback",
        );

        vi.mocked(globalThis.requireUser).mockResolvedValue(other);
        mockParams.values = { id: app.client_id };
        mockBody.value = { uri: "https://example.com/callback" };

        await expect(deleteHandler(createEvent())).rejects.toMatchObject({ statusCode: 403 });
    });

    it("returns 404 when the redirect URI does not exist on the application", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com" });
        const oauthDb = await import("~~/server/utils/database/oauth2_applications");
        const app = await oauthDb.createOAuth2Application(
            { context: { drizzle: ctx.drizzle } } as any,
            user.id,
            "No Match App",
            null,
            false,
            "third",
        );

        // Add a different URI
        await oauthDb.addOAuth2ApplicationRedirectUri(
            { context: { drizzle: ctx.drizzle } } as any,
            app.client_id,
            "https://example.com/existing",
        );

        vi.mocked(globalThis.requireUser).mockResolvedValue(user);
        mockParams.values = { id: app.client_id };
        mockBody.value = { uri: "https://example.com/nonexistent" };

        await expect(deleteHandler(createEvent())).rejects.toMatchObject({ statusCode: 404 });
    });

    it("returns 400 when body is empty", async () => {
        const originalReadValidatedBody = globalThis.readValidatedBody;
        vi.stubGlobal("readValidatedBody", async (_event: any, schema: any) => {
            const validate = typeof schema === "function" ? schema : schema.parse;
            return validate(mockBody.value);
        });

        try {
            const user = seedUser(ctx, { email: "owner@basischina.com" });
            const oauthDb = await import("~~/server/utils/database/oauth2_applications");
            const app = await oauthDb.createOAuth2Application(
                { context: { drizzle: ctx.drizzle } } as any,
                user.id,
                "No Body App",
                null,
                false,
                "third",
            );

            vi.mocked(globalThis.requireUser).mockResolvedValue(user);
            mockParams.values = { id: app.client_id };
            mockBody.value = {};

            await expect(deleteHandler(createEvent())).rejects.toThrow();
        } finally {
            vi.stubGlobal("readValidatedBody", originalReadValidatedBody);
        }
    });

    it("returns 400 when uri is an empty string", async () => {
        const originalReadValidatedBody = globalThis.readValidatedBody;
        vi.stubGlobal("readValidatedBody", async (_event: any, schema: any) => {
            const validate = typeof schema === "function" ? schema : schema.parse;
            return validate(mockBody.value);
        });

        try {
            const user = seedUser(ctx, { email: "owner@basischina.com" });
            const oauthDb = await import("~~/server/utils/database/oauth2_applications");
            const app = await oauthDb.createOAuth2Application(
                { context: { drizzle: ctx.drizzle } } as any,
                user.id,
                "Empty URI App",
                null,
                false,
                "third",
            );

            vi.mocked(globalThis.requireUser).mockResolvedValue(user);
            mockParams.values = { id: app.client_id };
            mockBody.value = { uri: "" };

            await expect(deleteHandler(createEvent())).rejects.toThrow();
        } finally {
            vi.stubGlobal("readValidatedBody", originalReadValidatedBody);
        }
    });

    it("returns 400 when uri is not a valid URL", async () => {
        const originalReadValidatedBody = globalThis.readValidatedBody;
        vi.stubGlobal("readValidatedBody", async (_event: any, schema: any) => {
            const validate = typeof schema === "function" ? schema : schema.parse;
            return validate(mockBody.value);
        });

        try {
            const user = seedUser(ctx, { email: "owner@basischina.com" });
            const oauthDb = await import("~~/server/utils/database/oauth2_applications");
            const app = await oauthDb.createOAuth2Application(
                { context: { drizzle: ctx.drizzle } } as any,
                user.id,
                "Bad URL App",
                null,
                false,
                "third",
            );

            vi.mocked(globalThis.requireUser).mockResolvedValue(user);
            mockParams.values = { id: app.client_id };
            mockBody.value = { uri: "not-a-valid-url" };

            await expect(deleteHandler(createEvent())).rejects.toThrow();
        } finally {
            vi.stubGlobal("readValidatedBody", originalReadValidatedBody);
        }
    });
});

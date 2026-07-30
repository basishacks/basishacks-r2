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

vi.mock("~~/server/utils/rateLimit", () => ({
    applyRateLimit: (fn: any) => fn,
}));

let ctx: TestContext;
let postHandler: any;

beforeAll(async () => {
    setupNitroGlobals();

    const oauthDb = await import("~~/server/utils/database/oauth2_applications");
    vi.stubGlobal("getOAuth2Application", oauthDb.getOAuth2Application);
    vi.stubGlobal("addOAuth2ApplicationRedirectUri", oauthDb.addOAuth2ApplicationRedirectUri);

    postHandler = (await import("~~/server/api/applications/[id]/redirect_uris/index.post")).default;
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

describe("POST /api/applications/:id/redirect_uris", () => {
    it("adds a redirect URI as the application owner", async () => {
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

        vi.mocked(globalThis.requireUser).mockResolvedValue(user);
        mockParams.values = { id: app.client_id };
        mockBody.value = { uri: "https://example.com/callback" };

        const result = await postHandler(createEvent());

        expect(result).toEqual({ message: "Redirect URI added" });

        const uris = await oauthDb.getOAuth2ApplicationRedirectUris(
            { context: { drizzle: ctx.drizzle } } as any,
            app.client_id,
        );
        expect(uris).toContain("https://example.com/callback");
    });

    it("adds a redirect URI as an admin", async () => {
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

        vi.mocked(globalThis.requireUser).mockResolvedValue(admin);
        mockParams.values = { id: app.client_id };
        mockBody.value = { uri: "https://app.example.com/oauth" };

        const result = await postHandler(createEvent());
        expect(result).toEqual({ message: "Redirect URI added" });
    });

    it("adds a redirect URI with portal.applications.view.all permission", async () => {
        const owner = seedUser(ctx, { email: "owner@basischina.com" });
        const viewer = seedUser(ctx, { email: "viewer@basischina.com" });
        const oauthDb = await import("~~/server/utils/database/oauth2_applications");
        const app = await oauthDb.createOAuth2Application(
            { context: { drizzle: ctx.drizzle } } as any,
            owner.id,
            "Viewable App",
            null,
            false,
            "third",
        );

        vi.mocked(globalThis.requireUser).mockResolvedValue({
            ...viewer,
            role: "portal.applications.view.all",
        });
        mockParams.values = { id: app.client_id };
        mockBody.value = { uri: "https://portal.example.com/cb" };

        const result = await postHandler(createEvent());
        expect(result).toEqual({ message: "Redirect URI added" });
    });

    it("accepts http://localhost URIs", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com" });
        const oauthDb = await import("~~/server/utils/database/oauth2_applications");
        const app = await oauthDb.createOAuth2Application(
            { context: { drizzle: ctx.drizzle } } as any,
            user.id,
            "Local Dev",
            null,
            false,
            "third",
        );

        vi.mocked(globalThis.requireUser).mockResolvedValue(user);
        mockParams.values = { id: app.client_id };
        mockBody.value = { uri: "http://localhost:3000/callback" };

        const result = await postHandler(createEvent());
        expect(result).toEqual({ message: "Redirect URI added" });
    });

    it("returns 404 when the application does not exist", async () => {
        vi.mocked(globalThis.requireUser).mockResolvedValue({ id: 1, role: "participant" });
        mockParams.values = { id: "nonexistent-client-id" };
        mockBody.value = { uri: "https://example.com/callback" };

        await expect(postHandler(createEvent())).rejects.toMatchObject({ statusCode: 404 });
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

        vi.mocked(globalThis.requireUser).mockResolvedValue(other);
        mockParams.values = { id: app.client_id };
        mockBody.value = { uri: "https://example.com/callback" };

        await expect(postHandler(createEvent())).rejects.toMatchObject({ statusCode: 403 });
    });

    it("returns 409 when the redirect URI already exists", async () => {
        const user = seedUser(ctx, { email: "owner@basischina.com" });
        const oauthDb = await import("~~/server/utils/database/oauth2_applications");
        const app = await oauthDb.createOAuth2Application(
            { context: { drizzle: ctx.drizzle } } as any,
            user.id,
            "Dup App",
            null,
            false,
            "third",
        );

        // Add the URI once
        await oauthDb.addOAuth2ApplicationRedirectUri(
            { context: { drizzle: ctx.drizzle } } as any,
            app.client_id,
            "https://example.com/dup",
        );

        vi.mocked(globalThis.requireUser).mockResolvedValue(user);
        mockParams.values = { id: app.client_id };
        mockBody.value = { uri: "https://example.com/dup" };

        await expect(postHandler(createEvent())).rejects.toMatchObject({ statusCode: 409 });
    });

    it("returns 400 for an invalid redirect URI (plain http, not localhost)", async () => {
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
                "Validation App",
                null,
                false,
                "third",
            );

            vi.mocked(globalThis.requireUser).mockResolvedValue(user);
            mockParams.values = { id: app.client_id };
            mockBody.value = { uri: "http://not-localhost.com/callback" };

            await expect(postHandler(createEvent())).rejects.toThrow();
        } finally {
            vi.stubGlobal("readValidatedBody", originalReadValidatedBody);
        }
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

            await expect(postHandler(createEvent())).rejects.toThrow();
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

            await expect(postHandler(createEvent())).rejects.toThrow();
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
            mockBody.value = { uri: "not-a-url" };

            await expect(postHandler(createEvent())).rejects.toThrow();
        } finally {
            vi.stubGlobal("readValidatedBody", originalReadValidatedBody);
        }
    });
});

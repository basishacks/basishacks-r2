import {
    createTestContext,
    resetTestContext,
    resetMockState,
    setupNitroGlobals,
    seedHackathon,
    seedSeason,
    seedUser,
    type TestContext,
} from "~~/tests/api/helpers";

let ctx: TestContext;
let listHandler: any;

beforeAll(async () => {
    setupNitroGlobals();

    const { convertUserToPublic } = await import("~~/server/utils/convert");
    vi.stubGlobal("convertUserToPublic", convertUserToPublic);

    listHandler = (await import("~~/server/api/users/index.get")).default;
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

describe("GET /api/users", () => {
    it("does not expose login_code or login_expiry", async () => {
        vi.mocked(globalThis.requirePermission).mockResolvedValue({ id: 1, role: "admin" });

        seedUser(ctx, {
            email: "alice@basischina.com",
            name: "Alice",
            login_code: "123456",
            login_expiry: Date.now() + 10 * 60 * 1000,
        });

        const result = await listHandler(createEvent());

        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty("id");
        expect(result[0]).toHaveProperty("email", "alice@basischina.com");
        expect(result[0]).toHaveProperty("name", "Alice");
        expect(result[0]).toHaveProperty("role");
        expect(result[0]).toHaveProperty("team_id");
        expect(result[0]).toHaveProperty("profile_theme");
        expect(result[0]).toHaveProperty("profile_picture");
        expect(result[0]).not.toHaveProperty("login_code");
        expect(result[0]).not.toHaveProperty("login_expiry");
    });
});

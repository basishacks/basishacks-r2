import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import {
    createTestContext,
    resetTestContext,
    resetMockState,
    setupNitroGlobals,
    mockBody,
    mockSession,
    seedUser,
    type TestContext,
} from "./helpers";

// Mock the auth utility module
vi.mock("~~/server/utils/auth", () => ({
    requireUser: vi.fn(),
    requireJudge: vi.fn(),
    requireAdmin: vi.fn(),
    requirePermission: vi.fn(),
}));

// Mock the rate limit wrapper
vi.mock("~~/server/utils/rateLimit", () => ({
    applyRateLimit: (fn: any) => fn,
    AUTH_RATE_LIMIT_CONFIG: { maxRequests: 600, windowMs: 60 * 1000 },
}));

let ctx: TestContext;
let impersonateHandler: any;

beforeAll(async () => {
    setupNitroGlobals();

    // Stub auto-imported database functions using real implementations
    const { getUser } = await import("~~/server/utils/database/users");
    vi.stubGlobal("getUser", getUser);

    // Import handler after globals are set up
    impersonateHandler = (await import("~~/server/api/auth/impersonate.post")).default;
});

beforeEach(async () => {
    resetMockState();
    ctx = await createTestContext();
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

describe("POST /api/auth/impersonate", () => {
    it("returns 403 when user is not admin", async () => {
        const { requireAdmin } = await import("~~/server/utils/auth");
        (requireAdmin as any).mockRejectedValue(
            Object.assign(new Error("Insufficient permissions"), { statusCode: 403 }),
        );

        mockBody.value = { userId: 1 };

        await expect(impersonateHandler(createEvent())).rejects.toMatchObject({
            statusCode: 403,
        });
    });

    it("returns 403 when target user does not exist (prevents enumeration)", async () => {
        const { requireAdmin } = await import("~~/server/utils/auth");
        (requireAdmin as any).mockResolvedValue({ id: 1, role: "admin" });

        mockBody.value = { userId: 9999 };

        await expect(impersonateHandler(createEvent())).rejects.toMatchObject({
            statusCode: 403,
        });
    });

    it("sets session to target user on successful impersonation", async () => {
        const { requireAdmin } = await import("~~/server/utils/auth");
        (requireAdmin as any).mockResolvedValue({ id: 1, role: "admin" });

        const target = seedUser(ctx, {
            email: "target@basischina.com",
            name: "Target User",
        });

        mockBody.value = { userId: target.id };

        const result = await impersonateHandler(createEvent());

        expect(result).toEqual({ success: true });
        expect(mockSession.value).toMatchObject({ user: { id: target.id } });
    });
});

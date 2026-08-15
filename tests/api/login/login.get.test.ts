import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { mockQueryState, resetMockState, setupNitroGlobals } from "../helpers";

const { beginFlowMock, getFlowMock, sanitizeMock, updateMock } = vi.hoisted(() => ({
    beginFlowMock: vi.fn(),
    getFlowMock: vi.fn(),
    sanitizeMock: vi.fn((value?: string) =>
        value?.startsWith("/") && !value.startsWith("//") ? value : undefined,
    ),
    updateMock: vi.fn(),
}));

vi.mock("~~/server/utils/rateLimit", () => ({
    applyRateLimit: (handler: any) => handler,
    AUTH_RATE_LIMIT_CONFIG: {},
}));

vi.mock("~~/server/utils/basis-auth", () => ({
    beginBasisAuthFlow: beginFlowMock,
    getBasisAuthFlowSession: getFlowMock,
    sanitizePostLoginRedirect: sanitizeMock,
}));

let handler: any;
const sendRedirectMock = vi.fn();

beforeAll(async () => {
    setupNitroGlobals();
    vi.stubGlobal("sendRedirect", sendRedirectMock);
    handler = (await import("~~/server/api/login.get")).default;
});

beforeEach(() => {
    resetMockState();
    vi.clearAllMocks();
    getFlowMock.mockResolvedValue({ update: updateMock });
    beginFlowMock.mockResolvedValue({
        url: new URL("https://auth.example.test/oauth/authorize?state=state"),
        transaction: { state: "state", nonce: "nonce", codeVerifier: "verifier" },
    });
});

describe("GET /api/login", () => {
    it("stores the encrypted login transaction before redirecting to basis-auth", async () => {
        mockQueryState.value = { redirect: "/dashboard" };
        await handler({ context: {} });

        expect(sanitizeMock).toHaveBeenCalledWith("/dashboard");
        expect(beginFlowMock).toHaveBeenCalledWith("/dashboard");
        expect(updateMock).toHaveBeenCalledWith({
            state: "state",
            nonce: "nonce",
            codeVerifier: "verifier",
        });
        expect(sendRedirectMock).toHaveBeenCalledWith(
            expect.anything(),
            "https://auth.example.test/oauth/authorize?state=state",
            302,
        );
    });

    it.each(["https://evil.example/phish", "//evil.example/phish"])(
        "does not preserve unsafe redirects: %s",
        async (redirect) => {
            mockQueryState.value = { redirect };
            await handler({ context: {} });
            expect(beginFlowMock).toHaveBeenCalledWith(undefined);
        },
    );
});

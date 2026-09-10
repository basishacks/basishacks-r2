import { beforeEach, describe, expect, it, vi } from "vitest";

const state = new Map<string, { value: any }>();
const clear = vi.fn();

beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    state.clear();
    vi.stubGlobal("defineNuxtPlugin", (plugin: any) => plugin);
    vi.stubGlobal("useState", (key: string, initial: () => any) => {
        if (!state.has(key)) state.set(key, { value: initial() });
        return state.get(key);
    });
    vi.stubGlobal("useUserSession", () => ({ loggedIn: { value: true }, clear }));
    vi.stubGlobal("window", {
        location: { pathname: "/dashboard", search: "", assign: vi.fn() },
    });
});

const success = (data: unknown) => ({ status: 200, code: 200, data });
const unauthorized = {
    status: 401,
    code: 401,
    error: "invalid_token",
    error_description: "Expired",
};

async function loadClient(nativeFetch: ReturnType<typeof vi.fn>) {
    vi.stubGlobal("$fetch", nativeFetch);
    const plugin = (await import("~~/app/plugins/api.client")).default;
    return plugin().provide.api as <T>(path: string, options?: any) => Promise<T>;
}

describe("browser API client", () => {
    it("bootstraps in memory, injects bearer auth, and unwraps APIResponse.data", async () => {
        const nativeFetch = vi.fn(async (path: string, options: any) => {
            if (path === "/api/auth/token") {
                return success({ accessToken: "token-1", expiresAt: Date.now() + 60_000 });
            }
            expect(new Headers(options.headers).get("authorization")).toBe("Bearer token-1");
            return success({ value: 42 });
        });
        const api = await loadClient(nativeFetch);

        await expect(api<{ value: number }>("/api/private")).resolves.toEqual({ value: 42 });
    });

    it("parses APIError and performs one refresh-and-retry for a 401", async () => {
        let tokenNumber = 0;
        let requests = 0;
        const nativeFetch = vi.fn(async (path: string) => {
            if (path === "/api/auth/token") {
                tokenNumber += 1;
                return success({
                    accessToken: `token-${tokenNumber}`,
                    expiresAt: Date.now() + 60_000,
                });
            }
            requests += 1;
            if (requests === 1) throw { data: unauthorized, statusCode: 401 };
            return success("retried");
        });
        const api = await loadClient(nativeFetch);

        await expect(api("/api/private")).resolves.toBe("retried");
        expect(tokenNumber).toBe(2);
        expect(requests).toBe(2);
    });

    it("clears auth and restarts login when refresh fails", async () => {
        let bootstrapped = false;
        const nativeFetch = vi.fn(async (path: string) => {
            if (path === "/api/auth/token" && !bootstrapped) {
                bootstrapped = true;
                return success({ accessToken: "token-1", expiresAt: Date.now() + 60_000 });
            }
            if (path === "/api/auth/token") throw { data: unauthorized, statusCode: 401 };
            throw { data: unauthorized, statusCode: 401 };
        });
        const api = await loadClient(nativeFetch);

        await expect(api("/api/private")).rejects.toMatchObject({
            error: "invalid_token",
            status: 401,
        });
        expect(clear).toHaveBeenCalledOnce();
        expect(window.location.assign).toHaveBeenCalledWith("/api/login?redirect=%2Fdashboard");
    });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const resetSession = vi.fn();

beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal("defineNuxtPlugin", (plugin: any) => plugin);
    vi.stubGlobal("useBasisAuthSession", () => ({ reset: resetSession }));
    vi.stubGlobal("window", {
        location: { pathname: "/dashboard", search: "?tab=team", assign: vi.fn() },
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
    it("relies on the HTTP-only cookie and unwraps APIResponse.data", async () => {
        const nativeFetch = vi.fn(async (_path: string, options: any) => {
            expect(new Headers(options?.headers).has("authorization")).toBe(false);
            return success({ value: 42 });
        });
        const api = await loadClient(nativeFetch);

        await expect(api<{ value: number }>("/api/private")).resolves.toEqual({ value: 42 });
        expect(nativeFetch).toHaveBeenCalledOnce();
    });

    it("clears browser state and restarts login after a protected API 401", async () => {
        const nativeFetch = vi.fn(async () => {
            throw { data: unauthorized, statusCode: 401 };
        });
        const api = await loadClient(nativeFetch);

        await expect(api("/api/private")).rejects.toMatchObject({
            error: "invalid_token",
            status: 401,
        });
        expect(resetSession).toHaveBeenCalledOnce();
        expect(window.location.assign).toHaveBeenCalledWith(
            "/api/login?redirect=%2Fdashboard%3Ftab%3Dteam",
        );
    });

    it("does not create a redirect loop when the session endpoint returns 401", async () => {
        const nativeFetch = vi.fn(async () => {
            throw { data: unauthorized, statusCode: 401 };
        });
        const api = await loadClient(nativeFetch);

        await expect(api("/api/auth/session")).rejects.toMatchObject({ status: 401 });
        expect(resetSession).not.toHaveBeenCalled();
        expect(window.location.assign).not.toHaveBeenCalled();
    });
});

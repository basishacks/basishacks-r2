import { beforeAll, describe, expect, it, vi } from "vitest";

let beforeResponse: ((event: any, response: any) => void) | undefined;

beforeAll(async () => {
    vi.stubGlobal("defineNitroPlugin", (plugin: any) => plugin);
    const plugin = (await import("~~/server/plugins/api-envelope")).default;
    plugin({
        hooks: {
            hook(name: string, callback: typeof beforeResponse) {
                if (name === "beforeResponse") beforeResponse = callback;
            },
        },
    });
});

const applyEnvelope = (body: unknown, statusCode = 200, path = "/api/test") => {
    const response = { body };
    beforeResponse!({ path, node: { res: { statusCode } } }, response);
    return response.body;
};

describe("APIResponse envelope plugin", () => {
    it("wraps object and array domain values and preserves HTTP status", () => {
        expect(applyEnvelope({ status: "in_progress" }, 201)).toEqual({
            status: 201,
            code: 201,
            data: { status: "in_progress" },
        });
        expect(applyEnvelope([1, 2])).toEqual({ status: 200, code: 200, data: [1, 2] });
    });

    it("does not double-wrap canonical envelopes", () => {
        const body = { status: 409, code: 409, error: "conflict", error_description: "No" };
        expect(applyEnvelope(body, 409)).toBe(body);
    });

    it("preserves redirects, streams, and other native responses", () => {
        const response = new Response("redirect", { status: 302 });
        expect(applyEnvelope(response, 302)).toBe(response);
        expect(applyEnvelope("validationToken")).toBe("validationToken");
        expect(applyEnvelope({ ok: true }, 200, "/not-api")).toEqual({ ok: true });
    });
});

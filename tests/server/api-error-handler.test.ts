import { APIError } from "@basis/schema/api";
import { beforeAll, describe, expect, it, vi } from "vitest";

const h3 = vi.hoisted(() => ({
    send: vi.fn((_event: any, value: string) => value),
    setResponseHeader: vi.fn(),
    setResponseStatus: vi.fn(),
}));

vi.mock("h3", () => h3);

let handler: any;

beforeAll(async () => {
    vi.stubGlobal("defineNitroErrorHandler", (value: any) => value);
    handler = (await import("~~/server/error")).default;
});

const invoke = (error: any) => {
    const event = {};
    const body = JSON.parse(handler(error, event));
    return { body, event };
};

describe("canonical API error handler", () => {
    it("preserves APIError names, codes, descriptions, and HTTP status", () => {
        const error = new APIError("conflict", "Already exists", 409, "duplicate");
        const { body, event } = invoke(error);

        expect(body).toEqual({
            status: 409,
            code: "duplicate",
            error: "conflict",
            error_description: "Already exists",
        });
        expect(h3.setResponseStatus).toHaveBeenCalledWith(event, 409);
    });

    it("maps safe H3 failures to stable error names", () => {
        expect(invoke({ statusCode: 429, message: "Too many requests" }).body).toEqual({
            status: 429,
            code: 429,
            error: "rate_limited",
            error_description: "Too many requests",
        });
    });

    it("logs unexpected exceptions and returns a generic description", () => {
        vi.spyOn(console, "error").mockImplementation(() => undefined);

        expect(invoke(new Error("database password leaked")).body).toEqual({
            status: 500,
            code: 500,
            error: "server_error",
            error_description: "The request could not be completed",
        });
        expect(console.error).toHaveBeenCalled();
    });
});

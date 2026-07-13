import { describe, it, expect, vi, beforeAll } from "vitest";
import { setupNitroGlobals } from "../../api/helpers";

describe("security headers middleware", () => {
    let middleware: (event: any) => Promise<void>;

    beforeAll(async () => {
        setupNitroGlobals();
        // Route setHeader through to the mock response so we can inspect headers.
        vi.stubGlobal("setHeader", (event: any, name: string, value: string) => {
            event.node.res.setHeader(name, value);
        });
        middleware = (await import("~~/server/middleware/security-headers")).default;
    });

    function createMockEvent(url: string) {
        const headers: Record<string, string> = {};
        return {
            node: {
                req: { url },
                res: {
                    setHeader: vi.fn((name: string, value: string) => {
                        headers[name.toLowerCase()] = value;
                    }),
                    getHeader: vi.fn((name: string) => headers[name.toLowerCase()]),
                },
            },
        };
    }

    it("sets all required security headers on a sample API route", async () => {
        const event = createMockEvent("/api/seasons/active");
        await middleware(event);

        expect(event.node.res.setHeader).toHaveBeenCalledWith(
            "Strict-Transport-Security",
            "max-age=63072000; includeSubDomains; preload",
        );
        expect(event.node.res.setHeader).toHaveBeenCalledWith("X-Frame-Options", "DENY");
        expect(event.node.res.setHeader).toHaveBeenCalledWith("X-Content-Type-Options", "nosniff");
        expect(event.node.res.setHeader).toHaveBeenCalledWith(
            "Referrer-Policy",
            "strict-origin-when-cross-origin",
        );
        expect(event.node.res.setHeader).toHaveBeenCalledWith(
            "Permissions-Policy",
            expect.stringContaining("camera=()"),
        );

        const cspCall = event.node.res.setHeader.mock.calls.find(
            ([name]: [string]) => name === "Content-Security-Policy",
        );
        expect(cspCall).toBeDefined();
        const csp = cspCall![1] as string;
        expect(csp).toContain("default-src 'self'");
        expect(csp).toContain("script-src 'self' 'unsafe-inline'");
        expect(csp).toContain("style-src 'self' 'unsafe-inline'");
        expect(csp).toContain("font-src 'self'");
        expect(csp).toContain("img-src 'self' blob: data:");
        expect(csp).toContain("connect-src 'self' https://login.microsoftonline.com");
        expect(csp).toContain("object-src 'none'");
        expect(csp).toContain("base-uri 'self'");
        expect(csp).toContain("form-action 'self'");
        expect(csp).toContain("frame-ancestors 'none'");
    });

    it("sets security headers on a sample page route", async () => {
        const event = createMockEvent("/dashboard");
        await middleware(event);

        expect(event.node.res.getHeader("x-frame-options")).toBe("DENY");
        expect(event.node.res.getHeader("x-content-type-options")).toBe("nosniff");

        const csp = event.node.res.getHeader("content-security-policy") as string;
        expect(csp).toContain("default-src 'self'");
        expect(csp).toContain("frame-ancestors 'none'");
    });

    it("disables the expected permissions in Permissions-Policy", async () => {
        const event = createMockEvent("/");
        await middleware(event);

        const policy = event.node.res.getHeader("permissions-policy") as string;
        const disabled = [
            "camera=()",
            "microphone=()",
            "geolocation=()",
            "payment=()",
            "usb=()",
            "magnetometer=()",
            "gyroscope=()",
            "accelerometer=()",
            "ambient-light-sensor=()",
            "autoplay=()",
            "encrypted-media=()",
            "picture-in-picture=()",
        ];
        for (const feature of disabled) {
            expect(policy).toContain(feature);
        }
    });
});

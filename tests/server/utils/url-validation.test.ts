import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateExternalUrl, fetchExternalHtml } from "~~/server/utils/url-validation";

describe("validateExternalUrl", () => {
    it("accepts public HTTPS URLs", () => {
        expect(validateExternalUrl("https://example.com/path").toString()).toBe(
            "https://example.com/path",
        );
    });

    it("accepts public HTTP URLs", () => {
        expect(validateExternalUrl("http://example.com").toString()).toBe("http://example.com/");
    });

    it("rejects localhost", () => {
        expect(() => validateExternalUrl("http://localhost:3000")).toThrow(
            "Private or loopback URLs are not allowed",
        );
    });

    it("rejects localhost subdomains", () => {
        expect(() => validateExternalUrl("http://localhost.example.com")).toThrow(
            "Private or loopback URLs are not allowed",
        );
    });

    it("rejects private IPv4 ranges", () => {
        expect(() => validateExternalUrl("http://10.0.0.1")).toThrow(
            "Private or loopback URLs are not allowed",
        );
        expect(() => validateExternalUrl("http://172.16.0.1")).toThrow(
            "Private or loopback URLs are not allowed",
        );
        expect(() => validateExternalUrl("http://192.168.1.1")).toThrow(
            "Private or loopback URLs are not allowed",
        );
        expect(() => validateExternalUrl("http://127.0.0.1")).toThrow(
            "Private or loopback URLs are not allowed",
        );
        expect(() => validateExternalUrl("http://169.254.0.1")).toThrow(
            "Private or loopback URLs are not allowed",
        );
    });

    it("accepts public IPv4 addresses", () => {
        expect(validateExternalUrl("http://8.8.8.8").toString()).toBe("http://8.8.8.8/");
    });

    it("rejects multicast IPv4 addresses", () => {
        expect(() => validateExternalUrl("http://224.0.0.1")).toThrow(
            "Private or loopback URLs are not allowed",
        );
        expect(() => validateExternalUrl("http://239.255.255.255")).toThrow(
            "Private or loopback URLs are not allowed",
        );
    });

    it("rejects loopback IPv6", () => {
        expect(() => validateExternalUrl("http://[::1]")).toThrow(
            "Private or loopback URLs are not allowed",
        );
    });

    it("rejects non-HTTP schemes", () => {
        expect(() => validateExternalUrl("file:///etc/passwd")).toThrow(
            "Only HTTP and HTTPS URLs are allowed",
        );
        expect(() => validateExternalUrl("ftp://example.com")).toThrow(
            "Only HTTP and HTTPS URLs are allowed",
        );
    });

    it("rejects malformed URLs", () => {
        expect(() => validateExternalUrl("not a url")).toThrow("Invalid URL");
    });

    it("rejects link-local IPv6 addresses", () => {
        expect(() => validateExternalUrl("http://[fe80::1]")).toThrow(
            "Private or loopback URLs are not allowed",
        );
    });

    it("rejects unique local IPv6 addresses", () => {
        expect(() => validateExternalUrl("http://[fd00::1]")).toThrow(
            "Private or loopback URLs are not allowed",
        );
    });

    it("rejects multicast IPv6 addresses", () => {
        expect(() => validateExternalUrl("http://[ff02::1]")).toThrow(
            "Private or loopback URLs are not allowed",
        );
    });

    it("rejects IPv4 with too many octets", () => {
        expect(() => validateExternalUrl("http://10.0.0.1.5")).not.toThrow(
            "Private or loopback URLs are not allowed",
        );
    });

    it("rejects IPv4 with out-of-range octets", () => {
        expect(() => validateExternalUrl("http://10.0.0.256")).not.toThrow(
            "Private or loopback URLs are not allowed",
        );
    });

    it("rejects IPv4 with non-numeric octets", () => {
        expect(() => validateExternalUrl("http://10.0.0.abc")).not.toThrow(
            "Private or loopback URLs are not allowed",
        );
    });

    it("rejects IPv4 with negative octets", () => {
        expect(() => validateExternalUrl("http://10.0.0.-1")).not.toThrow(
            "Private or loopback URLs are not allowed",
        );
    });

    it("rejects 0.0.0.0 as private", () => {
        expect(() => validateExternalUrl("http://0.0.0.0")).toThrow(
            "Private or loopback URLs are not allowed",
        );
    });
});

describe("fetchExternalHtml", () => {
    let originalFetch: typeof fetch;

    beforeEach(() => {
        originalFetch = globalThis.fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    function createResponse(overrides: Partial<Response> = {}): Response {
        return {
            status: 200,
            ok: true,
            headers: new Headers(),
            text: () => Promise.resolve("<html></html>"),
            ...overrides,
        } as Response;
    }

    it("returns HTML for a successful response", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            createResponse({
                text: () => Promise.resolve("<html><body>Hello</body></html>"),
            }),
        );

        const result = await fetchExternalHtml("https://example.com");

        expect(result).toBe("<html><body>Hello</body></html>");
    });

    it("truncates HTML to 15000 characters", async () => {
        const longHtml = "a".repeat(20000);
        globalThis.fetch = vi.fn().mockResolvedValue(
            createResponse({
                text: () => Promise.resolve(longHtml),
            }),
        );

        const result = await fetchExternalHtml("https://example.com");

        expect(result.length).toBe(15000);
    });

    it("passes init options to fetch", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(createResponse());

        await fetchExternalHtml("https://example.com", { headers: { "X-Test": "1" } });

        expect(globalThis.fetch).toHaveBeenCalledWith(
            "https://example.com/",
            expect.objectContaining({
                headers: { "X-Test": "1" },
                redirect: "manual",
            }),
        );
    });

    it("returns an error for non-ok responses", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            createResponse({
                status: 404,
                ok: false,
            }),
        );

        const result = await fetchExternalHtml("https://example.com");

        expect(result).toBe("Error: Failed to fetch. Status: 404");
    });

    it("follows a single redirect", async () => {
        globalThis.fetch = vi
            .fn()
            .mockResolvedValueOnce(
                createResponse({
                    status: 302,
                    ok: false,
                    headers: new Headers({ location: "https://redirect.example.com" }),
                }),
            )
            .mockResolvedValueOnce(
                createResponse({
                    text: () => Promise.resolve("<html>redirected</html>"),
                }),
            );

        const result = await fetchExternalHtml("https://example.com");

        expect(result).toBe("<html>redirected</html>");
        expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it("rejects redirects to private URLs", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            createResponse({
                status: 302,
                ok: false,
                headers: new Headers({ location: "http://localhost/secret" }),
            }),
        );

        await expect(fetchExternalHtml("https://example.com")).rejects.toThrow(
            "Private or loopback URLs are not allowed",
        );
    });

    it("returns an error for a redirect without a Location header", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            createResponse({
                status: 302,
                ok: false,
            }),
        );

        const result = await fetchExternalHtml("https://example.com");

        expect(result).toBe("Error: Redirect without Location header. Status: 302");
    });

    it("returns an error after too many redirects", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            createResponse({
                status: 302,
                ok: false,
                headers: new Headers({ location: "https://example.com/loop" }),
            }),
        );

        const result = await fetchExternalHtml("https://example.com");

        expect(result).toBe("Error: Too many redirects");
    });
});

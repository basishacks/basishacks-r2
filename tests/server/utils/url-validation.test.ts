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

    it("rejects 10.x.x.x subranges", () => {
        expect(() => validateExternalUrl("http://10.0.0.1")).toThrow(
            "Private or loopback URLs are not allowed",
        );
        expect(() => validateExternalUrl("http://10.255.255.255")).toThrow(
            "Private or loopback URLs are not allowed",
        );
        expect(() => validateExternalUrl("http://10.1.2.3")).toThrow(
            "Private or loopback URLs are not allowed",
        );
    });

    it("rejects 172.16.x.x through 172.31.x.x", () => {
        expect(() => validateExternalUrl("http://172.16.0.1")).toThrow(
            "Private or loopback URLs are not allowed",
        );
        expect(() => validateExternalUrl("http://172.20.0.1")).toThrow(
            "Private or loopback URLs are not allowed",
        );
        expect(() => validateExternalUrl("http://172.31.255.255")).toThrow(
            "Private or loopback URLs are not allowed",
        );
    });

    it("allows 172.15.x.x and 172.32.x.x (non-private 172 range)", () => {
        expect(validateExternalUrl("http://172.15.0.1").toString()).toBe("http://172.15.0.1/");
        expect(validateExternalUrl("http://172.32.0.1").toString()).toBe("http://172.32.0.1/");
    });

    it("allows 192.167.x.x (non-private 192 range)", () => {
        expect(validateExternalUrl("http://192.167.0.1").toString()).toBe("http://192.167.0.1/");
        expect(validateExternalUrl("http://192.169.0.1").toString()).toBe("http://192.169.0.1/");
    });

    it("rejects IPv6 unique-local (fc00::/7)", () => {
        expect(() => validateExternalUrl("http://[fc00::1]")).toThrow(
            "Private or loopback URLs are not allowed",
        );
        expect(() => validateExternalUrl("http://[fc01::]")).toThrow(
            "Private or loopback URLs are not allowed",
        );
        expect(() => validateExternalUrl("http://[fd12:3456::1]")).toThrow(
            "Private or loopback URLs are not allowed",
        );
    });

    it("rejects IPv6 link-local (fe80::/10) variants", () => {
        expect(() => validateExternalUrl("http://[fe80::1]")).toThrow(
            "Private or loopback URLs are not allowed",
        );
        expect(() => validateExternalUrl("http://[fe81::]")).toThrow(
            "Private or loopback URLs are not allowed",
        );
        expect(() => validateExternalUrl("http://[fe90::1]")).toThrow(
            "Private or loopback URLs are not allowed",
        );
        expect(() => validateExternalUrl("http://[fea0::1]")).toThrow(
            "Private or loopback URLs are not allowed",
        );
        expect(() => validateExternalUrl("http://[feb0::1]")).toThrow(
            "Private or loopback URLs are not allowed",
        );
    });

    it("rejects IPv6 multicast (ff00::/8)", () => {
        expect(() => validateExternalUrl("http://[ff00::1]")).toThrow(
            "Private or loopback URLs are not allowed",
        );
        expect(() => validateExternalUrl("http://[ff02::1]")).toThrow(
            "Private or loopback URLs are not allowed",
        );
        expect(() => validateExternalUrl("http://[ff05::1]")).toThrow(
            "Private or loopback URLs are not allowed",
        );
        expect(() => validateExternalUrl("http://[ff0e::1]")).toThrow(
            "Private or loopback URLs are not allowed",
        );
    });

    it("allows public IPv6 addresses", () => {
        expect(validateExternalUrl("http://[2001:db8::1]").toString()).toBe(
            "http://[2001:db8::1]/",
        );
        expect(validateExternalUrl("http://[2600::1]").toString()).toBe("http://[2600::1]/");
    });

    it("rejects DNS rebinding style hostnames that resolve to localhost", () => {
        expect(() => validateExternalUrl("http://localhost.evil.com")).toThrow(
            "Private or loopback URLs are not allowed",
        );
        expect(() => validateExternalUrl("http://evil.localhost.com")).not.toThrow(
            "Private or loopback URLs are not allowed",
        );
    });

    it("rejects IPv4 addresses with leading zeros (still parsed as private 10.x.x.x)", () => {
        expect(() => validateExternalUrl("http://10.0.0.01")).toThrow(
            "Private or loopback URLs are not allowed",
        );
    });

    it("rejects IPv4 addresses with trailing dots (URL normalizes to private 10.x.x.x)", () => {
        expect(() => validateExternalUrl("http://10.0.0.1.")).toThrow(
            "Private or loopback URLs are not allowed",
        );
    });

    it("allows non-private IPv4 with trailing dot (URL normalizes the hostname)", () => {
        expect(validateExternalUrl("http://8.8.8.8.").toString()).toBe("http://8.8.8.8/");
    });

    it("rejects URLs with fragments in validateExternalUrl", () => {
        expect(validateExternalUrl("https://example.com/page#section").hash).toBe("#section");
    });

    it("rejects URLs with auth (user:pass@)", () => {
        const url = validateExternalUrl("https://user:pass@example.com/path");
        expect(url.username).toBe("user");
        expect(url.password).toBe("pass");
    });

    it("rejects 127.x.x.x loopback range", () => {
        expect(() => validateExternalUrl("http://127.0.0.1")).toThrow(
            "Private or loopback URLs are not allowed",
        );
        expect(() => validateExternalUrl("http://127.255.255.255")).toThrow(
            "Private or loopback URLs are not allowed",
        );
        expect(() => validateExternalUrl("http://127.0.0.2")).toThrow(
            "Private or loopback URLs are not allowed",
        );
    });

    it("rejects 169.254.x.x link-local range", () => {
        expect(() => validateExternalUrl("http://169.254.0.1")).toThrow(
            "Private or loopback URLs are not allowed",
        );
        expect(() => validateExternalUrl("http://169.254.255.255")).toThrow(
            "Private or loopback URLs are not allowed",
        );
    });

    it("rejects 224.0.0.0 through 239.255.255.255 multicast range edges", () => {
        expect(() => validateExternalUrl("http://224.0.0.0")).toThrow(
            "Private or loopback URLs are not allowed",
        );
        expect(() => validateExternalUrl("http://239.255.255.255")).toThrow(
            "Private or loopback URLs are not allowed",
        );
    });

    it("accepts public IPv4 addresses just outside private ranges", () => {
        expect(validateExternalUrl("http://11.0.0.1").toString()).toBe("http://11.0.0.1/");
        expect(validateExternalUrl("http://173.16.0.1").toString()).toBe("http://173.16.0.1/");
        expect(validateExternalUrl("http://193.168.0.1").toString()).toBe("http://193.168.0.1/");
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

    it("follows multiple redirects up to the limit", async () => {
        globalThis.fetch = vi
            .fn()
            .mockResolvedValueOnce(
                createResponse({
                    status: 302,
                    ok: false,
                    headers: new Headers({ location: "https://redirect1.example.com" }),
                }),
            )
            .mockResolvedValueOnce(
                createResponse({
                    status: 302,
                    ok: false,
                    headers: new Headers({ location: "https://redirect2.example.com" }),
                }),
            )
            .mockResolvedValueOnce(
                createResponse({
                    status: 302,
                    ok: false,
                    headers: new Headers({ location: "https://redirect3.example.com" }),
                }),
            )
            .mockResolvedValueOnce(
                createResponse({
                    status: 302,
                    ok: false,
                    headers: new Headers({ location: "https://final.example.com" }),
                }),
            )
            .mockResolvedValueOnce(
                createResponse({
                    text: () => Promise.resolve("<html>after 4 redirects</html>"),
                }),
            );

        const result = await fetchExternalHtml("https://example.com");

        expect(result).toBe("<html>after 4 redirects</html>");
        expect(globalThis.fetch).toHaveBeenCalledTimes(5);
    });

    it("returns error for exact ceiling redirects (6 redirects = too many)", async () => {
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

    it("handles fetch network error gracefully", async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network failure"));

        await expect(fetchExternalHtml("https://example.com")).rejects.toThrow("Network failure");
    });

    it("returns error for non-ok non-redirect status (e.g. 500)", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            createResponse({
                status: 500,
                ok: false,
            }),
        );

        const result = await fetchExternalHtml("https://example.com");

        expect(result).toBe("Error: Failed to fetch. Status: 500");
    });

    it("returns error for 403 forbidden", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            createResponse({
                status: 403,
                ok: false,
            }),
        );

        const result = await fetchExternalHtml("https://example.com");

        expect(result).toBe("Error: Failed to fetch. Status: 403");
    });

    it("follows redirect with relative location header", async () => {
        globalThis.fetch = vi
            .fn()
            .mockResolvedValueOnce(
                createResponse({
                    status: 301,
                    ok: false,
                    headers: new Headers({ location: "/relative-path" }),
                }),
            )
            .mockResolvedValueOnce(
                createResponse({
                    text: () => Promise.resolve("<html>relative ok</html>"),
                }),
            );

        const result = await fetchExternalHtml("https://example.com/old");

        expect(result).toBe("<html>relative ok</html>");
        expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it("passes through custom headers to the initial fetch", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(createResponse());

        await fetchExternalHtml("https://example.com", {
            headers: { Authorization: "Bearer token123" },
        });

        expect(globalThis.fetch).toHaveBeenCalledWith(
            "https://example.com/",
            expect.objectContaining({
                headers: { Authorization: "Bearer token123" },
                redirect: "manual",
            }),
        );
    });

    it("uses the GET method when specified in init", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(createResponse());

        await fetchExternalHtml("https://example.com", { method: "GET" });

        expect(globalThis.fetch).toHaveBeenCalledWith(
            "https://example.com/",
            expect.objectContaining({ method: "GET", redirect: "manual" }),
        );
    });

    it("handles empty response text", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            createResponse({
                text: () => Promise.resolve(""),
            }),
        );

        const result = await fetchExternalHtml("https://example.com");

        expect(result).toBe("");
    });

    it("handles response with only whitespace", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            createResponse({
                text: () => Promise.resolve("   \n  \t  "),
            }),
        );

        const result = await fetchExternalHtml("https://example.com");

        expect(result).toBe("   \n  \t  ");
    });
});

import { validateExternalUrl } from "~~/server/utils/url-validation";

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
});

/**
 * Return true for relative paths rooted at `/` (but not protocol-relative `//`)
 * or for absolute http:// / https:// URLs.
 */
export function isSafeUrl(url: string): boolean {
    if (!url) return false;

    // Allow same-origin relative paths; reject protocol-relative URLs.
    if (url.startsWith("/") && !url.startsWith("//")) return true;

    try {
        const parsed = new URL(url);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
}

/**
 * Return the URL unchanged if it is safe, otherwise undefined.
 */
export function safeUrl(url: string | null | undefined): string | undefined {
    if (!url) return undefined;
    return isSafeUrl(url) ? url : undefined;
}

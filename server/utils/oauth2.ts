export function getPublicOrigin(): string {
    const origin = process.env.CURRENT_URL_ORIGIN || "http://localhost:3000";
    return origin.replace(/\/+$/, "");
}

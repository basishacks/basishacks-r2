import { APIError, apiResponseSchema } from "@basis/schema/api";
import { z } from "zod";

const responseSchema = apiResponseSchema({ data: z.unknown() });
const nativeFetch = globalThis.$fetch;

export default defineNuxtPlugin(() => {
    const accessToken = useState<string | null>("basis-access-token", () => null);
    const accessTokenExpiresAt = useState<number>("basis-access-token-expiry", () => 0);
    const { loggedIn, clear } = useUserSession();
    let bootstrap: Promise<void> | undefined;

    const ensureAccessToken = async (force = false) => {
        if (!loggedIn.value) return;
        if (!force && accessToken.value && accessTokenExpiresAt.value > Date.now() + 30_000) return;
        if (!bootstrap) {
            bootstrap = nativeFetch("/api/auth/token", { method: "POST" })
                .then((value) => {
                    const response = responseSchema.parse(value);
                    const data = z
                        .object({ accessToken: z.string(), expiresAt: z.number() })
                        .parse(response.data);
                    accessToken.value = data.accessToken;
                    accessTokenExpiresAt.value = data.expiresAt;
                })
                .finally(() => {
                    bootstrap = undefined;
                });
        }
        await bootstrap;
    };

    const request = async <T>(input: any, options: any = {}, retry = true): Promise<T> => {
        const path = typeof input === "string" ? input : (input?.toString?.() ?? "");
        const isApi = path.startsWith("/api/");
        const isTokenRoute = path === "/api/auth/token";
        if (isApi && !isTokenRoute) await ensureAccessToken();

        const headers = new Headers(options.headers);
        if (isApi && accessToken.value && !isTokenRoute) {
            headers.set("authorization", `Bearer ${accessToken.value}`);
        }

        try {
            const value = await nativeFetch(input, { ...options, headers });
            if (
                !isApi ||
                value === undefined ||
                value === null ||
                typeof value !== "object" ||
                value instanceof Blob ||
                value instanceof ArrayBuffer ||
                value instanceof Response
            ) {
                return value as T;
            }
            const data = responseSchema.parse(value).data as T;
            if (path === "/api/auth/logout") {
                accessToken.value = null;
                accessTokenExpiresAt.value = 0;
            }
            return data;
        } catch (cause: any) {
            const error = APIError.from(
                cause?.data,
                new APIError("invalid_response", "API request failed", cause?.statusCode ?? 500),
            );
            if (retry && error.status === 401 && !isTokenRoute) {
                accessToken.value = null;
                try {
                    await ensureAccessToken(true);
                    return await request<T>(input, options, false);
                } catch {
                    await clear();
                    const redirect = `${window.location.pathname}${window.location.search}`;
                    window.location.assign(`/api/login?redirect=${encodeURIComponent(redirect)}`);
                }
            }
            throw error;
        }
    };

    globalThis.$fetch = request as typeof globalThis.$fetch;
    return { provide: { api: request } };
});

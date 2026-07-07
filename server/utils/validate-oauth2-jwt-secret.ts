/**
 * Dev-only fallback for NUXT_OAUTH2_JWT_SECRET. It is exactly 32 bytes so it
 * satisfies the HS256 key length requirement for local development and tests.
 * NEVER use this value in production.
 */
export const DEV_OAUTH2_JWT_SECRET_FALLBACK = "dev-only-placeholder-32-bytes!!";

export interface ValidateOAuth2JWTSecretOptions {
    /** Environment object to read from / write to. Defaults to process.env. */
    env?: Record<string, string | undefined>;
    /** Exit handler for fatal production errors. Defaults to process.exit. */
    exit?: (code: number) => never;
    /** Error logger. Defaults to console.error. */
    logError?: (...args: unknown[]) => void;
    /** Warning logger. Defaults to console.warn. */
    logWarn?: (...args: unknown[]) => void;
}

/**
 * Ensure NUXT_OAUTH2_JWT_SECRET is configured and at least 32 bytes long.
 *
 * In production, a missing or too-short secret is fatal and the process exits.
 * In development/test, a prominent warning is logged and a documented dev-only
 * fallback is written back to the env object (usually process.env) so existing
 * code can continue without failing.
 */
export function validateOAuth2JWTSecret(options: ValidateOAuth2JWTSecretOptions = {}): void {
    const env = options.env ?? process.env;
    const exit = options.exit ?? ((code: number) => process.exit(code));
    const logError = options.logError ?? console.error;
    const logWarn = options.logWarn ?? console.warn;

    const secret = env.NUXT_OAUTH2_JWT_SECRET;
    const isProduction = env.NODE_ENV === "production";
    const length = secret ? new TextEncoder().encode(secret).length : 0;

    if (!secret || length < 32) {
        if (isProduction) {
            const reason = secret ? `only ${length} bytes (must be at least 32 bytes)` : "not set";
            logError(
                `[FATAL] NUXT_OAUTH2_JWT_SECRET is ${reason}. ` +
                    "Set it to a strong secret (e.g. openssl rand -base64 32) and restart the server.",
            );
            exit(1);
        } else {
            const reason = secret ? `only ${length} bytes (must be at least 32 bytes)` : "not set";
            logWarn(
                `[WARNING] NUXT_OAUTH2_JWT_SECRET is ${reason}. ` +
                    `Using dev-only fallback "${DEV_OAUTH2_JWT_SECRET_FALLBACK}". ` +
                    "DO NOT use this fallback in production.",
            );
            env.NUXT_OAUTH2_JWT_SECRET = DEV_OAUTH2_JWT_SECRET_FALLBACK;
        }
    }
}

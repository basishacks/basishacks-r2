import { describe, it, expect, vi } from "vitest";
import {
    validateOAuth2JWTSecret,
    DEV_OAUTH2_JWT_SECRET_FALLBACK,
} from "~~/server/utils/validate-oauth2-jwt-secret";

function setup() {
    const env: Record<string, string | undefined> = {};
    const exit = vi.fn<(code: number) => never>();
    const errors: string[] = [];
    const warnings: string[] = [];

    function run(secret?: string, nodeEnv?: string) {
        if (secret !== undefined) env.NUXT_OAUTH2_JWT_SECRET = secret;
        if (nodeEnv !== undefined) env.NODE_ENV = nodeEnv;
        validateOAuth2JWTSecret({
            env,
            exit: exit as unknown as (code: number) => never,
            logError: (...args) => errors.push(args.join(" ")),
            logWarn: (...args) => warnings.push(args.join(" ")),
        });
    }

    return { env, exit, errors, warnings, run };
}

describe("validateOAuth2JWTSecret", () => {
    it("does nothing when the secret is at least 32 bytes", () => {
        const { env, exit, errors, warnings, run } = setup();
        run("a-secret-that-is-exactly-32-bytes!", "production");
        expect(exit).not.toHaveBeenCalled();
        expect(errors).toHaveLength(0);
        expect(warnings).toHaveLength(0);
        expect(env.NUXT_OAUTH2_JWT_SECRET).toBe("a-secret-that-is-exactly-32-bytes!");
    });

    it("exits in production when the secret is missing", () => {
        const { env, exit, errors, warnings, run } = setup();
        run(undefined, "production");
        expect(exit).toHaveBeenCalledWith(1);
        expect(errors.some((m) => m.includes("NUXT_OAUTH2_JWT_SECRET is not set"))).toBe(true);
        expect(errors.some((m) => m.includes("[FATAL]"))).toBe(true);
        expect(warnings).toHaveLength(0);
        expect(env.NUXT_OAUTH2_JWT_SECRET).toBeUndefined();
    });

    it("exits in production when the secret is shorter than 32 bytes", () => {
        const { env, exit, errors, warnings, run } = setup();
        run("short-secret", "production");
        expect(exit).toHaveBeenCalledWith(1);
        expect(errors.some((m) => m.includes("only 12 bytes"))).toBe(true);
        expect(errors.some((m) => m.includes("[FATAL]"))).toBe(true);
        expect(warnings).toHaveLength(0);
        expect(env.NUXT_OAUTH2_JWT_SECRET).toBe("short-secret");
    });

    it("warns and applies the dev fallback in development", () => {
        const { env, exit, errors, warnings, run } = setup();
        run(undefined, "development");
        expect(exit).not.toHaveBeenCalled();
        expect(errors).toHaveLength(0);
        expect(warnings.some((m) => m.includes("[WARNING]"))).toBe(true);
        expect(warnings.some((m) => m.includes("NUXT_OAUTH2_JWT_SECRET is not set"))).toBe(true);
        expect(warnings.some((m) => m.includes("Using dev-only fallback"))).toBe(true);
        expect(env.NUXT_OAUTH2_JWT_SECRET).toBe(DEV_OAUTH2_JWT_SECRET_FALLBACK);
    });

    it("warns and applies the dev fallback in test", () => {
        const { env, exit, errors, warnings, run } = setup();
        run(undefined, "test");
        expect(exit).not.toHaveBeenCalled();
        expect(errors).toHaveLength(0);
        expect(warnings.some((m) => m.includes("Using dev-only fallback"))).toBe(true);
        expect(env.NUXT_OAUTH2_JWT_SECRET).toBe(DEV_OAUTH2_JWT_SECRET_FALLBACK);
    });

    it("warns and replaces a too-short secret with the dev fallback", () => {
        const { env, exit, errors, warnings, run } = setup();
        run("short", "development");
        expect(exit).not.toHaveBeenCalled();
        expect(errors).toHaveLength(0);
        expect(warnings.some((m) => m.includes("only 5 bytes"))).toBe(true);
        expect(warnings.some((m) => m.includes("Using dev-only fallback"))).toBe(true);
        expect(env.NUXT_OAUTH2_JWT_SECRET).toBe(DEV_OAUTH2_JWT_SECRET_FALLBACK);
    });

    it("treats an empty string as missing and applies the dev fallback", () => {
        const { env, exit, errors, warnings, run } = setup();
        run("", "development");
        expect(exit).not.toHaveBeenCalled();
        expect(errors).toHaveLength(0);
        expect(warnings.some((m) => m.includes("NUXT_OAUTH2_JWT_SECRET is not set"))).toBe(true);
        expect(env.NUXT_OAUTH2_JWT_SECRET).toBe(DEV_OAUTH2_JWT_SECRET_FALLBACK);
    });
});

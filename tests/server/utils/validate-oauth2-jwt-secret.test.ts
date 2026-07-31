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

    it("uses default options when called without arguments", () => {
        const originalSecret = process.env.NUXT_OAUTH2_JWT_SECRET;
        process.env.NUXT_OAUTH2_JWT_SECRET = "a-secret-that-is-exactly-32-bytes!";
        try {
            expect(() => validateOAuth2JWTSecret()).not.toThrow();
        } finally {
            if (originalSecret === undefined) {
                delete process.env.NUXT_OAUTH2_JWT_SECRET;
            } else {
                process.env.NUXT_OAUTH2_JWT_SECRET = originalSecret;
            }
        }
    });

    it("exits when the secret is exactly 31 bytes in production", () => {
        const { env, exit, errors, warnings, run } = setup();
        run("x".repeat(31), "production");
        expect(exit).toHaveBeenCalledWith(1);
        expect(errors.some((m) => m.includes("only 31 bytes"))).toBe(true);
        expect(warnings).toHaveLength(0);
    });

    it("passes when the secret is exactly 32 bytes in production", () => {
        const { env, exit, errors, warnings, run } = setup();
        run("exactly-32-bytes-secret-for-testing!", "production");
        expect(exit).not.toHaveBeenCalled();
        expect(errors).toHaveLength(0);
        expect(warnings).toHaveLength(0);
    });

    it("passes when the secret is 64 bytes in production", () => {
        const { env, exit, errors, warnings, run } = setup();
        run("a".repeat(64), "production");
        expect(exit).not.toHaveBeenCalled();
        expect(errors).toHaveLength(0);
        expect(warnings).toHaveLength(0);
    });

    it("exits when the secret is 0 bytes in production", () => {
        const { env, exit, errors, warnings, run } = setup();
        run("", "production");
        expect(exit).toHaveBeenCalledWith(1);
        expect(errors.some((m) => m.includes("not set"))).toBe(true);
        expect(errors.some((m) => m.includes("[FATAL]"))).toBe(true);
    });

    it("correctly counts unicode characters that are multi-byte", () => {
        const { env, exit, errors, warnings, run } = setup();
        // Each emoji is 4 bytes in UTF-8
        run("\u{1F600}".repeat(8), "production");
        // 8 emojis * 4 bytes = 32 bytes, should pass
        expect(exit).not.toHaveBeenCalled();
        expect(errors).toHaveLength(0);
    });

    it("correctly detects multi-byte unicode as too short", () => {
        const { env, exit, errors, warnings, run } = setup();
        // Each emoji is 4 bytes, 7 emojis = 28 bytes, too short
        run("\u{1F600}".repeat(7), "production");
        expect(exit).toHaveBeenCalledWith(1);
        expect(errors.some((m) => m.includes("only 28 bytes"))).toBe(true);
    });

    it("handles CJK characters which are 3 bytes each", () => {
        const { env, exit, errors, warnings, run } = setup();
        // 11 CJK chars * 3 bytes = 33 bytes, should pass
        run("你好世界这是一条测试密", "production");
        expect(exit).not.toHaveBeenCalled();
        expect(errors).toHaveLength(0);
    });

    it("handles CJK characters that are too short", () => {
        const { env, exit, errors, warnings, run } = setup();
        // 10 CJK chars * 3 bytes = 30 bytes, too short
        run("你好世界这是一条测试", "production");
        expect(exit).toHaveBeenCalledWith(1);
        expect(errors.some((m) => m.includes("only 30 bytes"))).toBe(true);
    });

    it("handles special characters in the secret", () => {
        const { env, exit, errors, warnings, run } = setup();
        run("!@#$%^&*()_+-=[]{}|;':\",./<>?`~abcdefghij", "production");
        expect(exit).not.toHaveBeenCalled();
        expect(errors).toHaveLength(0);
    });

    it("handles hex-only secrets correctly", () => {
        const { env, exit, errors, warnings, run } = setup();
        run("0123456789abcdef0123456789abcdef", "production");
        expect(exit).not.toHaveBeenCalled();
        expect(errors).toHaveLength(0);
    });

    it("handles a 31-byte hex secret as fatal in production", () => {
        const { env, exit, errors, warnings, run } = setup();
        run("0123456789abcdef0123456789abcde", "production");
        expect(exit).toHaveBeenCalledWith(1);
        expect(errors.some((m) => m.includes("only 31 bytes"))).toBe(true);
    });

    it("does not modify NODE_ENV after validation", () => {
        const { env, exit, errors, warnings, run } = setup();
        env.NODE_ENV = "production";
        run("a-secret-that-is-exactly-32-bytes!", "production");
        expect(env.NODE_ENV).toBe("production");
    });

    it("allows overriding the env object explicitly", () => {
        const customEnv: Record<string, string | undefined> = {
            NUXT_OAUTH2_JWT_SECRET: "a-secret-that-is-exactly-32-bytes!",
            NODE_ENV: "production",
        };
        const exit = vi.fn();
        validateOAuth2JWTSecret({
            env: customEnv,
            exit: exit as unknown as (code: number) => never,
            logError: () => {},
            logWarn: () => {},
        });
        expect(exit).not.toHaveBeenCalled();
    });

    it("allows overriding logError and logWarn", () => {
        const customEnv: Record<string, string | undefined> = {
            NODE_ENV: "development",
        };
        const exit = vi.fn();
        const logError = vi.fn();
        const logWarn = vi.fn();
        validateOAuth2JWTSecret({
            env: customEnv,
            exit: exit as unknown as (code: number) => never,
            logError,
            logWarn,
        });
        expect(logWarn).toHaveBeenCalled();
        expect(logWarn.mock.calls[0].some((m: string) => m.includes("[WARNING]"))).toBe(true);
        expect(logError).not.toHaveBeenCalled();
    });

    it("allows overriding logError and sees fatal messages in production", () => {
        const customEnv: Record<string, string | undefined> = {
            NODE_ENV: "production",
        };
        const exit = vi.fn();
        const logError = vi.fn();
        const logWarn = vi.fn();
        validateOAuth2JWTSecret({
            env: customEnv,
            exit: exit as unknown as (code: number) => never,
            logError,
            logWarn,
        });
        expect(logError).toHaveBeenCalled();
        expect(logError.mock.calls[0].some((m: string) => m.includes("[FATAL]"))).toBe(true);
        expect(logWarn).not.toHaveBeenCalled();
        expect(exit).toHaveBeenCalledWith(1);
    });

    it("uses process.exit as the default exit handler in production", () => {
        const originalSecret = process.env.NUXT_OAUTH2_JWT_SECRET;
        const originalEnv = process.env.NODE_ENV;
        const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
            throw new Error("process.exit called") as never;
        });
        process.env.NUXT_OAUTH2_JWT_SECRET = "";
        process.env.NODE_ENV = "production";
        try {
            expect(() => validateOAuth2JWTSecret()).toThrow("process.exit called");
            expect(exitSpy).toHaveBeenCalledWith(1);
        } finally {
            exitSpy.mockRestore();
            if (originalSecret === undefined) {
                delete process.env.NUXT_OAUTH2_JWT_SECRET;
            } else {
                process.env.NUXT_OAUTH2_JWT_SECRET = originalSecret;
            }
            if (originalEnv === undefined) {
                delete process.env.NODE_ENV;
            } else {
                process.env.NODE_ENV = originalEnv;
            }
        }
    });
});

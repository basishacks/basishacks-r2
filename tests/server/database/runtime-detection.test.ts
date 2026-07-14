import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import Database from "better-sqlite3";
import { sql } from "drizzle-orm";
import * as schema from "~~/server/database/schema";
import { createDrizzleDatabase, getDb } from "~~/server/database";

// Hoisted mocks for the Bun branch. `vi.mock` is hoisted to the top of the
// file, so the factories can only reference values created via `vi.hoisted`.
// These stay dormant while `typeof Bun === 'undefined'` (the Node.js path
// imports `better-sqlite3` and `drizzle-orm/better-sqlite3`, neither of which
// is mocked here).
const { bunDatabaseCtor, bunDrizzleResult } = vi.hoisted(() => ({
    // Regular function (not arrow) so it can be invoked with `new Database(...)`.
    bunDatabaseCtor: vi.fn(function () {
        return {
            exec: vi.fn(),
            prepare: vi.fn().mockReturnValue({
                run: vi.fn(),
                all: vi.fn().mockReturnValue([]),
                get: vi.fn().mockReturnValue(undefined),
            }),
        };
    }),
    bunDrizzleResult: { __bunDrizzle: true },
}));

vi.mock("bun:sqlite", () => ({ Database: bunDatabaseCtor }));
vi.mock("drizzle-orm/bun-sqlite", () => ({
    drizzle: vi.fn().mockReturnValue(bunDrizzleResult),
}));

// `createDrizzleDatabase` constructs its own connection from a file path, and
// `migrateLegacySchema` assumes the legacy base tables already exist (it issues
// `ALTER TABLE hackathon ...` before the Drizzle migration creates `hackathon`).
// Pre-applying `sql/archive/init.sql` mirrors the real production bootstrap and
// keeps the legacy repair step from throwing on a fresh database.
const initSQL = readFileSync(resolve(process.cwd(), "sql", "archive", "init.sql"), "utf-8");

let tmpDir: string;
let dbPath: string;
let db: ReturnType<typeof createDrizzleDatabase> extends Promise<infer T> ? T : never;

beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "bh-rt-"));
    dbPath = join(tmpDir, "test.sqlite");
    const seed = new Database(dbPath);
    seed.exec(initSQL);
    seed.close();
});

afterEach(() => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (db as any)?.$client?.close?.();
    } catch {
        // ignore — connection may already be closed
    }
    try {
        rmSync(tmpDir, { recursive: true, force: true });
    } catch {
        // ignore cleanup failures (e.g. open handles on Windows)
    }
});

describe("createDrizzleDatabase — Node.js / better-sqlite3 path", () => {
    // Vitest runs under Node.js, so the `typeof Bun !== 'undefined'` check is
    // false and the better-sqlite3 branch is exercised directly.

    it("detects Node.js runtime (Bun global is undefined)", () => {
        expect(typeof Bun).toBe("undefined");
    });

    it("returns a Drizzle instance exposing query builder methods", async () => {
        db = await createDrizzleDatabase(dbPath);

        expect(typeof db.select).toBe("function");
        expect(typeof db.insert).toBe("function");
        expect(typeof db.update).toBe("function");
        expect(typeof db.delete).toBe("function");
    });

    it("returns a Drizzle instance exposing the transaction helper", async () => {
        db = await createDrizzleDatabase(dbPath);

        expect(typeof db.transaction).toBe("function");
    });

    it("runs migrations and seeds the hackathon singleton row", async () => {
        db = await createDrizzleDatabase(dbPath);

        const tables = db.all<{ name: string }>(
            sql`SELECT name FROM sqlite_master WHERE type='table'`,
        );
        expect(tables.map((t) => t.name)).toContain("hackathon");

        const row = db.select().from(schema.hackathon).get();
        expect(row).toBeDefined();
        expect(row!.id).toBe(1);
        expect(row!.status).toBe("not_started");
    });
});

describe("createDrizzleDatabase — Bun / bun:sqlite path", () => {
    const originalBun = (globalThis as { Bun?: unknown }).Bun;

    afterEach(() => {
        // Restore the Node.js runtime so subsequent tests take the better-sqlite3 branch.
        (globalThis as { Bun?: unknown }).Bun = originalBun;
    });

    it("uses bun:sqlite + drizzle-orm/bun-sqlite when the Bun global is present", async () => {
        // Pretend Bun is the active runtime so the dynamic-import branch resolves
        // `bun:sqlite` and `drizzle-orm/bun-sqlite` (both mocked above).
        (globalThis as { Bun?: unknown }).Bun = {};

        bunDatabaseCtor.mockClear();
        db = await createDrizzleDatabase(":memory:");

        expect(bunDatabaseCtor).toHaveBeenCalledWith(":memory:");
        expect(db).toBe(bunDrizzleResult);
    });
});

describe("getDb", () => {
    it("delegates to createDrizzleDatabase and returns a Drizzle instance", async () => {
        db = await getDb(dbPath);

        expect(typeof db.select).toBe("function");
        expect(typeof db.insert).toBe("function");
    });
});

import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestDatabase } from "~~/tests/setup";
import {
    migrateDatabase,
    columnExists,
    createAndMigrateDatabase,
} from "~~/server/database/migrate";

describe("migrateDatabase", () => {
    it("applies an ALTER-only migration instead of skipping it", async () => {
        const wrapper = await createTestDatabase();
        const rawDb = wrapper.getRawDb();

        // Create a temp migrations directory with an ALTER-only migration
        const migrationsDir = mkdtempSync(join(tmpdir(), "basishacks-migrations-"));
        writeFileSync(
            join(migrationsDir, "0001_test_alter_only.sql"),
            "ALTER TABLE users ADD COLUMN migrate_test_col INTEGER;",
        );

        try {
            migrateDatabase(rawDb, migrationsDir);

            const rows = rawDb
                .prepare("SELECT name FROM pragma_table_info('users') WHERE name = ?")
                .all("migrate_test_col") as any[];
            expect(rows.length).toBe(1);

            // Running again should be idempotent (recorded in _drizzle_migrations)
            migrateDatabase(rawDb, migrationsDir);
            const recorded = rawDb
                .prepare("SELECT COUNT(*) AS count FROM _drizzle_migrations")
                .get() as { count: number };
            expect(recorded.count).toBe(1);
        } finally {
            rmSync(migrationsDir, { recursive: true, force: true });
            wrapper.close();
        }
    });
});

describe("columnExists", () => {
    it("returns false when PRAGMA table_info throws", async () => {
        const wrapper = await createTestDatabase();
        const rawDb = wrapper.getRawDb();

        const throwingDb = {
            ...rawDb,
            prepare(sql: string) {
                if (sql.startsWith("PRAGMA table_info")) {
                    throw new Error("forced pragma failure");
                }
                return rawDb.prepare(sql);
            },
        };

        expect(columnExists(throwingDb, "hackathon", "status")).toBe(false);
        wrapper.close();
    });
});

describe("createAndMigrateDatabase — fully migrated database", () => {
    it("takes the else branches in migrateLegacySchema when tables/columns exist", async () => {
        const wrapper = await createTestDatabase();
        const rawDb = wrapper.getRawDb();

        // All legacy tables and columns are already present, so migrateLegacySchema
        // should hit every else branch without throwing.
        expect(() => createAndMigrateDatabase(rawDb)).not.toThrow();

        wrapper.close();
    });
});

describe("migrateDatabase — CREATE TABLE scenarios", () => {
    it("creates tables from migration files and marks them as applied", async () => {
        const wrapper = await createTestDatabase();
        const rawDb = wrapper.getRawDb();
        const migrationsDir = mkdtempSync(join(tmpdir(), "basishacks-ct-scenarios-"));

        try {
            writeFileSync(
                join(migrationsDir, "0001_create_test.sql"),
                "CREATE TABLE migrate_test_table (id INTEGER);",
            );

            migrateDatabase(rawDb, migrationsDir);
            expect(columnExists(rawDb, "migrate_test_table", "id")).toBe(true);

            const recorded = rawDb.prepare("SELECT hash FROM _drizzle_migrations").all() as {
                hash: string;
            }[];
            expect(recorded.some((r) => r.hash.includes("0001_create_test"))).toBe(true);
        } finally {
            rmSync(migrationsDir, { recursive: true, force: true });
            wrapper.close();
        }
    });

    it("handles CREATE TABLE IF NOT EXISTS in migration files", async () => {
        const wrapper = await createTestDatabase();
        const rawDb = wrapper.getRawDb();
        const migrationsDir = mkdtempSync(join(tmpdir(), "basishacks-ifnotexists-"));

        try {
            writeFileSync(
                join(migrationsDir, "0001_ifnot.sql"),
                "CREATE TABLE IF NOT EXISTS ifnot_test (id INTEGER);",
            );

            expect(() => migrateDatabase(rawDb, migrationsDir)).not.toThrow();
            expect(columnExists(rawDb, "ifnot_test", "id")).toBe(true);
        } finally {
            rmSync(migrationsDir, { recursive: true, force: true });
            wrapper.close();
        }
    });

    it("handles multiple CREATE TABLE statements in one file", async () => {
        const wrapper = await createTestDatabase();
        const rawDb = wrapper.getRawDb();
        const migrationsDir = mkdtempSync(join(tmpdir(), "basishacks-multi-ct-"));

        try {
            writeFileSync(
                join(migrationsDir, "0001_multi.sql"),
                "CREATE TABLE multi_a (id INTEGER);\n--> statement-breakpoint\nCREATE TABLE multi_b (id INTEGER);",
            );

            migrateDatabase(rawDb, migrationsDir);
            expect(columnExists(rawDb, "multi_a", "id")).toBe(true);
            expect(columnExists(rawDb, "multi_b", "id")).toBe(true);
        } finally {
            rmSync(migrationsDir, { recursive: true, force: true });
            wrapper.close();
        }
    });

    it("handles ALTER-only migrations (no CREATE TABLE)", async () => {
        const wrapper = await createTestDatabase();
        const rawDb = wrapper.getRawDb();
        const migrationsDir = mkdtempSync(join(tmpdir(), "basishacks-alter-"));

        try {
            writeFileSync(
                join(migrationsDir, "0001_alter.sql"),
                "ALTER TABLE teams ADD COLUMN alter_scenario_col TEXT;",
            );

            migrateDatabase(rawDb, migrationsDir);
            expect(columnExists(rawDb, "teams", "alter_scenario_col")).toBe(true);
        } finally {
            rmSync(migrationsDir, { recursive: true, force: true });
            wrapper.close();
        }
    });
});

describe("migrateDatabase — empty migrations directory", () => {
    it("does nothing when there are no migration files", async () => {
        const wrapper = await createTestDatabase();
        const rawDb = wrapper.getRawDb();
        const emptyDir = mkdtempSync(join(tmpdir(), "basishacks-empty-migrations-"));

        try {
            expect(() => migrateDatabase(rawDb, emptyDir)).not.toThrow();
            // _drizzle_migrations should still be created but empty
            const count = rawDb
                .prepare("SELECT COUNT(*) AS count FROM _drizzle_migrations")
                .get() as { count: number };
            expect(count.count).toBe(0);
        } finally {
            rmSync(emptyDir, { recursive: true, force: true });
            wrapper.close();
        }
    });
});

describe("migrateDatabase — multiple migrations", () => {
    it("applies migrations in lexicographic order", async () => {
        const wrapper = await createTestDatabase();
        const rawDb = wrapper.getRawDb();
        const migrationsDir = mkdtempSync(join(tmpdir(), "basishacks-ordering-"));

        try {
            writeFileSync(
                join(migrationsDir, "0002_second.sql"),
                "ALTER TABLE teams ADD COLUMN order_test_2 INTEGER;",
            );
            writeFileSync(
                join(migrationsDir, "0001_first.sql"),
                "ALTER TABLE teams ADD COLUMN order_test_1 INTEGER;",
            );

            migrateDatabase(rawDb, migrationsDir);

            // Both columns should exist
            expect(columnExists(rawDb, "teams", "order_test_1")).toBe(true);
            expect(columnExists(rawDb, "teams", "order_test_2")).toBe(true);

            const recorded = rawDb
                .prepare("SELECT hash FROM _drizzle_migrations ORDER BY hash")
                .all() as { hash: string }[];
            expect(recorded).toHaveLength(2);
            expect(recorded[0].hash).toBe("0001_first.sql");
            expect(recorded[1].hash).toBe("0002_second.sql");
        } finally {
            rmSync(migrationsDir, { recursive: true, force: true });
            wrapper.close();
        }
    });
});

describe("migrateDatabase — already-applied migrations", () => {
    it("skips migrations whose hash is already tracked", async () => {
        const wrapper = await createTestDatabase();
        const rawDb = wrapper.getRawDb();
        const migrationsDir = mkdtempSync(join(tmpdir(), "basishacks-already-applied-"));

        try {
            writeFileSync(
                join(migrationsDir, "0001_test.sql"),
                "CREATE TABLE test_skip_table (id INTEGER);",
            );

            // First run applies it
            migrateDatabase(rawDb, migrationsDir);
            expect(columnExists(rawDb, "test_skip_table", "id")).toBe(true);

            // Drop the table to prove the second run doesn't re-apply
            rawDb.exec("DROP TABLE test_skip_table");

            // Second run should skip it since hash exists
            migrateDatabase(rawDb, migrationsDir);
            expect(columnExists(rawDb, "test_skip_table", "id")).toBe(false);

            const recorded = rawDb
                .prepare("SELECT COUNT(*) AS count FROM _drizzle_migrations")
                .get() as { count: number };
            expect(recorded.count).toBe(1);
        } finally {
            rmSync(migrationsDir, { recursive: true, force: true });
            wrapper.close();
        }
    });
});

describe("migrateDatabase — ALTER-only migrations", () => {
    it("applies an ALTER-only migration that was not yet recorded", async () => {
        const wrapper = await createTestDatabase();
        const rawDb = wrapper.getRawDb();
        const migrationsDir = mkdtempSync(join(tmpdir(), "basishacks-alter-test-"));

        try {
            writeFileSync(
                join(migrationsDir, "0001_alter_only.sql"),
                "ALTER TABLE users ADD COLUMN alter_test_col TEXT;",
            );

            migrateDatabase(rawDb, migrationsDir);
            expect(columnExists(rawDb, "users", "alter_test_col")).toBe(true);
        } finally {
            rmSync(migrationsDir, { recursive: true, force: true });
            wrapper.close();
        }
    });

    it("correctly handles statement-breakpoint splitting", async () => {
        const wrapper = await createTestDatabase();
        const rawDb = wrapper.getRawDb();
        const migrationsDir = mkdtempSync(join(tmpdir(), "basishacks-breakpoint-"));

        try {
            writeFileSync(
                join(migrationsDir, "0001_multi_stmt.sql"),
                "ALTER TABLE users ADD COLUMN bp_col1 INTEGER;" +
                    "\n--> statement-breakpoint\n" +
                    "ALTER TABLE teams ADD COLUMN bp_col2 TEXT;",
            );

            migrateDatabase(rawDb, migrationsDir);
            expect(columnExists(rawDb, "users", "bp_col1")).toBe(true);
            expect(columnExists(rawDb, "teams", "bp_col2")).toBe(true);
        } finally {
            rmSync(migrationsDir, { recursive: true, force: true });
            wrapper.close();
        }
    });
});

describe("migrateDatabase — error cases", () => {
    it("throws when a migration file contains invalid SQL", async () => {
        const wrapper = await createTestDatabase();
        const rawDb = wrapper.getRawDb();
        const migrationsDir = mkdtempSync(join(tmpdir(), "basishacks-bad-sql-"));

        try {
            writeFileSync(
                join(migrationsDir, "0001_bad.sql"),
                "CREATE TABLE invalid_sql (id INTEGER;", // missing closing paren
            );

            expect(() => migrateDatabase(rawDb, migrationsDir)).toThrow();
        } finally {
            rmSync(migrationsDir, { recursive: true, force: true });
            wrapper.close();
        }
    });
});

describe("columnExists", () => {
    it("returns true for an existing column", async () => {
        const wrapper = await createTestDatabase();
        const rawDb = wrapper.getRawDb();
        expect(columnExists(rawDb, "users", "id")).toBe(true);
        expect(columnExists(rawDb, "users", "email")).toBe(true);
        wrapper.close();
    });

    it("returns false for a non-existent column", async () => {
        const wrapper = await createTestDatabase();
        const rawDb = wrapper.getRawDb();
        expect(columnExists(rawDb, "users", "nonexistent_column_xyz")).toBe(false);
        wrapper.close();
    });

    it("returns false for a non-existent table", async () => {
        const wrapper = await createTestDatabase();
        const rawDb = wrapper.getRawDb();
        expect(columnExists(rawDb, "nonexistent_table", "id")).toBe(false);
        wrapper.close();
    });
});

describe("seedHackathon", () => {
    it("inserts the default hackathon row when table is empty", async () => {
        const wrapper = await createTestDatabase();
        const rawDb = wrapper.getRawDb();
        const { seedHackathon } = await import("~~/server/database/migrate");

        // Delete existing hackathon row
        rawDb.exec("DELETE FROM hackathon");

        seedHackathon(rawDb);

        const row = rawDb.prepare("SELECT status FROM hackathon WHERE id = 1").get() as {
            status: string;
        };
        expect(row).toBeDefined();
        expect(row.status).toBe("not_started");
        wrapper.close();
    });

    it("does not insert when a hackathon row already exists", async () => {
        const wrapper = await createTestDatabase();
        const rawDb = wrapper.getRawDb();
        const { seedHackathon } = await import("~~/server/database/migrate");

        // First seed to insert the row
        seedHackathon(rawDb);

        const before = rawDb.prepare("SELECT COUNT(*) AS count FROM hackathon").get() as {
            count: number;
        };
        expect(before.count).toBe(1);

        // Second call should not insert another row
        seedHackathon(rawDb);

        const after = rawDb.prepare("SELECT COUNT(*) AS count FROM hackathon").get() as {
            count: number;
        };
        expect(after.count).toBe(before.count);
        wrapper.close();
    });
});

describe("migrateDatabase — non-.sql files ignored", () => {
    it("ignores non-.sql files in the migrations directory", async () => {
        const wrapper = await createTestDatabase();
        const rawDb = wrapper.getRawDb();
        const migrationsDir = mkdtempSync(join(tmpdir(), "basishacks-non-sql-"));

        try {
            writeFileSync(
                join(migrationsDir, "0001_test.txt"),
                "ALTER TABLE teams ADD COLUMN ignored_txt_col INTEGER;",
            );
            writeFileSync(
                join(migrationsDir, "0002_test.sql"),
                "ALTER TABLE teams ADD COLUMN applied_sql_col INTEGER;",
            );

            migrateDatabase(rawDb, migrationsDir);
            expect(columnExists(rawDb, "teams", "ignored_txt_col")).toBe(false);
            expect(columnExists(rawDb, "teams", "applied_sql_col")).toBe(true);
        } finally {
            rmSync(migrationsDir, { recursive: true, force: true });
            wrapper.close();
        }
    });
});

describe("createAndMigrateDatabase", () => {
    it("runs migrations and seeds the hackathon row without throwing", async () => {
        const wrapper = await createTestDatabase();
        const rawDb = wrapper.getRawDb();

        // Delete hackathon row to test seeding path
        rawDb.exec("DELETE FROM hackathon");

        expect(() => createAndMigrateDatabase(rawDb)).not.toThrow();

        // Verify hackathon was seeded
        const row = rawDb.prepare("SELECT status FROM hackathon WHERE id = 1").get() as {
            status: string;
        };
        expect(row).toBeDefined();
        expect(row.status).toBe("not_started");

        wrapper.close();
    });
});

describe("migrateDatabase — idempotent CREATE TABLE", () => {
    it("does not throw when a migration creates a table that already exists", async () => {
        const wrapper = await createTestDatabase();
        const rawDb = wrapper.getRawDb();
        const migrationsDir = mkdtempSync(join(tmpdir(), "basishacks-idempotent-"));

        try {
            writeFileSync(
                join(migrationsDir, "0001_recreate.sql"),
                "CREATE TABLE users (id INTEGER);",
            );

            // users table already exists from init.sql
            expect(() => migrateDatabase(rawDb, migrationsDir)).not.toThrow();
        } finally {
            rmSync(migrationsDir, { recursive: true, force: true });
            wrapper.close();
        }
    });
});

describe("migrateDatabase — applies multiple migrations in order", () => {
    it("records all migration hashes correctly", async () => {
        const wrapper = await createTestDatabase();
        const rawDb = wrapper.getRawDb();
        const migrationsDir = mkdtempSync(join(tmpdir(), "basishacks-hashes-"));

        try {
            writeFileSync(
                join(migrationsDir, "0001_a.sql"),
                "ALTER TABLE teams ADD COLUMN hash_col_a INTEGER;",
            );
            writeFileSync(
                join(migrationsDir, "0002_b.sql"),
                "ALTER TABLE teams ADD COLUMN hash_col_b INTEGER;",
            );
            writeFileSync(
                join(migrationsDir, "0003_c.sql"),
                "ALTER TABLE teams ADD COLUMN hash_col_c INTEGER;",
            );

            migrateDatabase(rawDb, migrationsDir);

            const hashes = rawDb
                .prepare("SELECT hash FROM _drizzle_migrations ORDER BY hash")
                .all() as { hash: string }[];
            expect(hashes).toHaveLength(3);
            expect(hashes[0].hash).toBe("0001_a.sql");
            expect(hashes[1].hash).toBe("0002_b.sql");
            expect(hashes[2].hash).toBe("0003_c.sql");
        } finally {
            rmSync(migrationsDir, { recursive: true, force: true });
            wrapper.close();
        }
    });
});

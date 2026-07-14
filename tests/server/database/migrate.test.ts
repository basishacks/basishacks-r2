import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestDatabase } from "~~/tests/setup";
import {
    migrateDatabase,
    seedOAuth2ApplicationRedirectUri,
    columnExists,
    createAndMigrateDatabase,
} from "~~/server/database/migrate";
import { buildOnsiteRedirectUri } from "~~/server/utils/oauth2";

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

describe("seedOAuth2ApplicationRedirectUri", () => {
    it("adds the onsite redirect URI when it is not already allowed", async () => {
        const wrapper = await createTestDatabase();
        const rawDb = wrapper.getRawDb();
        const originalClientId = process.env.ONSITE_LOGIN_CLIENT_ID;

        process.env.ONSITE_LOGIN_CLIENT_ID = "onsite-client-id";
        rawDb
            .prepare(
                "INSERT INTO oauth2_applications (client_id, client_secret, name, redirect_uris) VALUES (?, ?, ?, ?)",
            )
            .run(
                "onsite-client-id",
                "secret",
                "Onsite App",
                "https://existing.example.com/callback",
            );

        try {
            seedOAuth2ApplicationRedirectUri(rawDb);

            const app = rawDb
                .prepare("SELECT redirect_uris FROM oauth2_applications WHERE client_id = ?")
                .get<{ redirect_uris: string }>("onsite-client-id");
            expect(app!.redirect_uris).toContain("http://localhost:3000/api/oauth2/dccallback");
            expect(app!.redirect_uris).toContain("https://existing.example.com/callback");
        } finally {
            process.env.ONSITE_LOGIN_CLIENT_ID = originalClientId;
            wrapper.close();
        }
    });

    it("does nothing when the redirect URI is already allowed", async () => {
        const wrapper = await createTestDatabase();
        const rawDb = wrapper.getRawDb();
        const originalClientId = process.env.ONSITE_LOGIN_CLIENT_ID;

        process.env.ONSITE_LOGIN_CLIENT_ID = "onsite-client-id";
        const redirectUri = buildOnsiteRedirectUri();
        rawDb
            .prepare(
                "INSERT INTO oauth2_applications (client_id, client_secret, name, redirect_uris) VALUES (?, ?, ?, ?)",
            )
            .run("onsite-client-id", "secret", "Onsite App", redirectUri);

        try {
            seedOAuth2ApplicationRedirectUri(rawDb);

            const app = rawDb
                .prepare("SELECT redirect_uris FROM oauth2_applications WHERE client_id = ?")
                .get<{ redirect_uris: string }>("onsite-client-id");
            expect(app!.redirect_uris).toBe(redirectUri);
        } finally {
            process.env.ONSITE_LOGIN_CLIENT_ID = originalClientId;
            wrapper.close();
        }
    });

    it("does nothing when the onsite application does not exist", async () => {
        const wrapper = await createTestDatabase();
        const rawDb = wrapper.getRawDb();
        const originalClientId = process.env.ONSITE_LOGIN_CLIENT_ID;

        process.env.ONSITE_LOGIN_CLIENT_ID = "missing-client-id";

        try {
            expect(() => seedOAuth2ApplicationRedirectUri(rawDb)).not.toThrow();
        } finally {
            process.env.ONSITE_LOGIN_CLIENT_ID = originalClientId;
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

describe("seedOAuth2ApplicationRedirectUri — null redirect_uris branch", () => {
    it("adds the redirect URI when redirect_uris is null", async () => {
        const wrapper = await createTestDatabase();
        const rawDb = wrapper.getRawDb();
        const originalClientId = process.env.ONSITE_LOGIN_CLIENT_ID;

        process.env.ONSITE_LOGIN_CLIENT_ID = "onsite-client-id";
        rawDb
            .prepare(
                "INSERT INTO oauth2_applications (client_id, client_secret, name, redirect_uris) VALUES (?, ?, ?, ?)",
            )
            .run("onsite-client-id", "secret", "Onsite App", null);

        try {
            seedOAuth2ApplicationRedirectUri(rawDb);

            const app = rawDb
                .prepare("SELECT redirect_uris FROM oauth2_applications WHERE client_id = ?")
                .get<{ redirect_uris: string }>("onsite-client-id");
            expect(app!.redirect_uris).toBe("http://localhost:3000/api/oauth2/dccallback");
        } finally {
            process.env.ONSITE_LOGIN_CLIENT_ID = originalClientId;
            wrapper.close();
        }
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

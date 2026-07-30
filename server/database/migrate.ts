import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { buildOnsiteRedirectUri } from "~~/server/utils/oauth2";

const MIGRATIONS_DIR = resolve(process.cwd(), "drizzle");

/**
 * Minimal structural interface for a SQLite database covering only the raw
 * API subset used by this module (`exec` + `prepare().run/all/get`).
 *
 * Both `bun:sqlite` and `better-sqlite3` satisfy this shape, allowing the
 * migration runner to operate under either runtime.
 */
interface PortableSqlite {
    exec(sql: string): void;
    prepare(sql: string): {
        run(...params: unknown[]): unknown;
        all<T = unknown>(...params: unknown[]): T[];
        get<T = unknown>(...params: unknown[]): T | undefined;
    };
}

/**
 * Runs pending Drizzle migration SQL files against a SQLite database.
 *
 * Migration files are read from the `drizzle/` directory and applied in
 * lexicographic order. A `_drizzle_migrations` table tracks applied files so
 * migrations are only run once.
 *
 * @param sqlite - SQLite database instance (bun:sqlite or better-sqlite3)
 */
function getExistingTables(sqlite: PortableSqlite): Set<string> {
    const rows = sqlite
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all<{ name: string }>();
    return new Set(rows.map((row) => row.name));
}

function extractCreatedTables(sql: string): string[] {
    const tables: string[] = [];
    const regex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([^`\s(]+)`?/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(sql)) !== null) {
        tables.push(match[1]);
    }
    return tables;
}

export function migrateDatabase(sqlite: PortableSqlite, migrationsDir: string = MIGRATIONS_DIR) {
    sqlite.exec(`
    CREATE TABLE IF NOT EXISTS _drizzle_migrations (
      hash TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);

    const applied = new Set(
        sqlite
            .prepare("SELECT hash FROM _drizzle_migrations")
            .all<{ hash: string }>()
            .map((row) => row.hash),
    );

    const migrationFiles = readdirSync(migrationsDir)
        .filter((file) => file.endsWith(".sql"))
        .sort();

    const existingTables = getExistingTables(sqlite);

    for (const file of migrationFiles) {
        if (applied.has(file)) continue;

        const sql = readFileSync(resolve(migrationsDir, file), "utf-8");

        // If the migration would create tables that already exist, assume it was
        // applied before migration tracking was in place and just record it.
        const createdTables = extractCreatedTables(sql);
        const alreadyApplied =
            createdTables.length > 0 &&
            createdTables.every(
                (table) => table === "_drizzle_migrations" || existingTables.has(table),
            );

        if (!alreadyApplied) {
            const statements = sql
                .split("--> statement-breakpoint")
                .map((s) => s.trim())
                .filter((s) => s.length > 0);

            for (const statement of statements) {
                // Make CREATE statements idempotent so migrations can safely re-run
                // against databases that were initialized before migration tracking.
                const idempotentStatement = statement
                    .replace(
                        /CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS)/i,
                        "CREATE TABLE IF NOT EXISTS ",
                    )
                    .replace(
                        /CREATE\s+UNIQUE\s+INDEX\s+(?!IF\s+NOT\s+EXISTS)/i,
                        "CREATE UNIQUE INDEX IF NOT EXISTS ",
                    )
                    .replace(
                        /CREATE\s+INDEX\s+(?!IF\s+NOT\s+EXISTS)/i,
                        "CREATE INDEX IF NOT EXISTS ",
                    );
                sqlite.exec(idempotentStatement);
            }
            console.log(`[Nitro] Applied migration: ${file}`);
        } else {
            console.log(`[Nitro] Migration already applied, recording: ${file}`);
        }

        sqlite.prepare("INSERT INTO _drizzle_migrations (hash) VALUES (?)").run(file);
    }
}

/**
 * Ensures the hackathon singleton row exists.
 *
 * If the `hackathon` table has no rows, inserts the default initial state.
 *
 * @param sqlite - SQLite database instance (bun:sqlite or better-sqlite3)
 */
export function seedHackathon(sqlite: PortableSqlite) {
    const row = sqlite.prepare("SELECT COUNT(*) AS count FROM hackathon").get<{ count: number }>();

    if (row && row.count === 0) {
        sqlite.exec(
            `
      INSERT INTO hackathon (
        id, status, voting_enabled, results_published, submitted_count,
        max_votes_per_user, judging_open, schedule_start, schedule_end,
        start_timestamp, end_timestamp, voting_start_timestamp,
        voting_end_timestamp, results_open_timestamp, theme_name, theme_description
      ) VALUES (1, 'not_started', 0, 0, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, NULL, NULL)
    `,
        );
        console.log("[Nitro] Seeded default hackathon row");
    }
}

/**
 * Ensures the onsite-login OAuth2 application allows the redirect URI used by
 * /api/login. This prevents "Application does not allow redirect_uri" errors
 * after fresh checkouts or when the configured origin changes.
 *
 * @param sqlite - SQLite database instance (bun:sqlite or better-sqlite3)
 */
export function seedOAuth2ApplicationRedirectUri(sqlite: PortableSqlite) {
    const clientId = process.env.ONSITE_LOGIN_CLIENT_ID;
    if (!clientId) return;

    const redirectUri = buildOnsiteRedirectUri();

    const app = sqlite
        .prepare("SELECT redirect_uris FROM oauth2_applications WHERE client_id = ?")
        .get<{ redirect_uris: string | null }>(clientId);

    if (!app) {
        console.log(
            `[Nitro] Onsite login application ${clientId} not found; skipping redirect URI seed`,
        );
        return;
    }

    const existing = app.redirect_uris ? app.redirect_uris.split(" ").filter((u) => u) : [];
    if (existing.includes(redirectUri)) return;

    const updated = [...existing, redirectUri].join(" ");
    sqlite
        .prepare("UPDATE oauth2_applications SET redirect_uris = ? WHERE client_id = ?")
        .run(updated, clientId);
    console.log(`[Nitro] Added redirect URI to onsite login application: ${redirectUri}`);
}

function tableExists(sqlite: PortableSqlite, table: string): boolean {
    const row = sqlite
        .prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = ?")
        .get<{ count: number }>(table);
    return row ? row.count > 0 : false;
}

export function columnExists(sqlite: PortableSqlite, table: string, column: string): boolean {
    try {
        const rows = sqlite.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
        return rows.some((row) => row.name === column);
    } catch {
        return false;
    }
}

/**
 * Brings legacy databases (created from sql/archive/init.sql) up to date with
 * the current Drizzle schema without dropping existing data.
 *
 * @param sqlite - SQLite database instance (bun:sqlite or better-sqlite3)
 */
function migrateLegacySchema(sqlite: PortableSqlite) {
    // Missing tables from the legacy init.sql schema
    if (!tableExists(sqlite, "seasons")) {
        sqlite.exec(`
      CREATE TABLE IF NOT EXISTS seasons (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        name TEXT NOT NULL,
        is_active INTEGER DEFAULT 0 NOT NULL,
        CONSTRAINT "seasons_is_active_check" CHECK("seasons"."is_active" IN (0, 1))
      )
    `);
        sqlite.exec("CREATE UNIQUE INDEX IF NOT EXISTS seasons_name_unique ON seasons (name)");
        console.log("[Nitro] Created legacy-missing table: seasons");
    }

    if (!tableExists(sqlite, "team_awards")) {
        sqlite.exec(`
      CREATE TABLE IF NOT EXISTS team_awards (
        team_id INTEGER NOT NULL,
        award TEXT NOT NULL,
        meta TEXT NOT NULL
      )
    `);
        console.log("[Nitro] Created legacy-missing table: team_awards");
    }

    if (!tableExists(sqlite, "peer_voting_scores")) {
        sqlite.exec(`
      CREATE TABLE IF NOT EXISTS peer_voting_scores (
        user_id INTEGER NOT NULL,
        score TEXT NOT NULL,
        reasoning TEXT
      )
    `);
        console.log("[Nitro] Created legacy-missing table: peer_voting_scores");
    }

    if (!tableExists(sqlite, "user_past_teams")) {
        sqlite.exec(`
      CREATE TABLE IF NOT EXISTS user_past_teams (
        user_id INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        PRIMARY KEY(user_id, team_id)
      )
    `);
        console.log("[Nitro] Created legacy-missing table: user_past_teams");
    }

    // Missing columns on the seasons table (per-season hackathon config)
    const seasonColumns = [
        "status",
        "voting_enabled",
        "results_published",
        "max_votes_per_user",
        "judging_open",
        "schedule_start",
        "schedule_end",
        "start_timestamp",
        "end_timestamp",
        "voting_start_timestamp",
        "voting_end_timestamp",
        "results_open_timestamp",
        "theme_name",
        "theme_description",
    ];
    for (const column of seasonColumns) {
        if (!columnExists(sqlite, "seasons", column)) {
            const type =
                column.endsWith("_timestamp") ||
                [
                    "voting_enabled",
                    "results_published",
                    "max_votes_per_user",
                    "judging_open",
                ].includes(column)
                    ? "INTEGER NOT NULL DEFAULT 0"
                    : column.endsWith("_name") ||
                        column.endsWith("_description") ||
                        column.startsWith("schedule_") ||
                        column === "status"
                      ? column === "status"
                          ? "TEXT NOT NULL DEFAULT 'not_started'"
                          : "TEXT"
                      : "INTEGER NOT NULL DEFAULT 0";
            sqlite.exec(`ALTER TABLE seasons ADD COLUMN ${column} ${type}`);
            console.log(`[Nitro] Added missing column: seasons.${column}`);
        }
    }

    // Missing columns on the legacy hackathon table
    const hackathonColumns = [
        "voting_enabled",
        "results_published",
        "submitted_count",
        "max_votes_per_user",
        "judging_open",
        "schedule_start",
        "schedule_end",
    ];
    for (const column of hackathonColumns) {
        if (!columnExists(sqlite, "hackathon", column)) {
            const defaultValue = ["schedule_start", "schedule_end"].includes(column) ? "NULL" : "0";
            sqlite.exec(
                `ALTER TABLE hackathon ADD COLUMN ${column} INTEGER DEFAULT ${defaultValue}`,
            );
            console.log(`[Nitro] Added legacy-missing column: hackathon.${column}`);
        }
    }

    // Missing columns on the legacy teams table
    if (!columnExists(sqlite, "teams", "season_id")) {
        sqlite.exec("ALTER TABLE teams ADD COLUMN season_id INTEGER DEFAULT 1 NOT NULL");
        console.log("[Nitro] Added legacy-missing column: teams.season_id");
    }

    if (!columnExists(sqlite, "teams", "sourcing")) {
        sqlite.exec("ALTER TABLE teams ADD COLUMN sourcing TEXT DEFAULT '' NOT NULL");
        console.log("[Nitro] Added legacy-missing column: teams.sourcing");
    }

    // Missing columns on the legacy team_scores table
    if (!columnExists(sqlite, "team_scores", "season_id")) {
        sqlite.exec("ALTER TABLE team_scores ADD COLUMN season_id INTEGER");
        console.log("[Nitro] Added legacy-missing column: team_scores.season_id");
    }

    // Legacy oauth2_applications may be missing owner_id
    if (!columnExists(sqlite, "oauth2_applications", "owner_id")) {
        sqlite.exec("ALTER TABLE oauth2_applications ADD COLUMN owner_id INTEGER");
        console.log("[Nitro] Added legacy-missing column: oauth2_applications.owner_id");
    }
}

/**
 * Runs legacy schema repair, pending migrations, and hackathon seeding against
 * an already-opened SQLite database instance. The caller is responsible for
 * constructing the database and setting PRAGMAs (see `index.ts`).
 *
 * @param sqlite - Open SQLite database instance (bun:sqlite or better-sqlite3)
 */
export function createAndMigrateDatabase(sqlite: PortableSqlite) {
    migrateLegacySchema(sqlite);
    migrateDatabase(sqlite);
    seedHackathon(sqlite);
    seedOAuth2ApplicationRedirectUri(sqlite);

    return sqlite;
}

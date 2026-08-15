import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

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

function extractAddedColumns(sql: string): Array<{ table: string; column: string }> {
    const columns: Array<{ table: string; column: string }> = [];
    const regex = /ALTER\s+TABLE\s+`?([^`\s]+)`?\s+ADD\s+`?([^`\s]+)`?/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(sql)) !== null) {
        columns.push({ table: match[1], column: match[2] });
    }
    return columns;
}

function extractCreatedIndexes(sql: string): string[] {
    const indexes: string[] = [];
    const regex = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([^`\s]+)`?/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(sql)) !== null) indexes.push(match[1]);
    return indexes;
}

function indexExists(sqlite: PortableSqlite, index: string): boolean {
    return Boolean(
        sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = ?").get(index),
    );
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
        const addedColumns = extractAddedColumns(sql);
        const createdIndexes = extractCreatedIndexes(sql);
        const hasStructuralChanges =
            createdTables.length + addedColumns.length + createdIndexes.length > 0;
        const alreadyApplied =
            hasStructuralChanges &&
            createdTables.every(
                (table) => table === "_drizzle_migrations" || existingTables.has(table),
            ) &&
            addedColumns.every(({ table, column }) => columnExists(sqlite, table, column)) &&
            createdIndexes.every((index) => indexExists(sqlite, index));

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
        id, status, voting_enabled, results_published, show_scores, show_ranking,
        submitted_count, max_votes_per_user, judging_open, schedule_start, schedule_end,
        start_timestamp, end_timestamp, voting_start_timestamp,
        voting_end_timestamp, results_open_timestamp, theme_name, theme_description
      ) VALUES (1, 'not_started', 0, 0, 0, 0, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, NULL, NULL)
    `,
        );
        console.log("[Nitro] Seeded default hackathon row");
    }
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

function migrateLegacyAwardsSchema(sqlite: PortableSqlite) {
    if (!tableExists(sqlite, "awards")) return;

    if (!columnExists(sqlite, "awards", "namespace")) {
        const colorExpression = columnExists(sqlite, "awards", "color")
            ? "COALESCE(color, 'gold')"
            : "'gold'";
        sqlite.exec("ALTER TABLE awards RENAME TO legacy_awards");
        sqlite.exec(`
      CREATE TABLE awards (
        namespace TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT 'gold'
      )
    `);
        sqlite.exec(`
      INSERT INTO awards(namespace, name, description, icon, color)
      SELECT 'legacy_' || id, name, description, icon, ${colorExpression}
      FROM legacy_awards
    `);
        sqlite.exec("DROP TABLE legacy_awards");
        console.log("[Nitro] Migrated legacy awards catalog to namespace keys");
    }

    if (!columnExists(sqlite, "awards", "color")) {
        sqlite.exec("ALTER TABLE awards ADD COLUMN color TEXT NOT NULL DEFAULT 'gold'");
    }

    sqlite.exec(`
    INSERT OR IGNORE INTO awards(namespace, name, description, icon, color)
    VALUES (
      'perfect_score',
      'Flawless',
      'Achieve a perfect score from all judges.',
      'i-lucide-gem',
      'gold'
    )
  `);

    if (tableExists(sqlite, "team_awards") && columnExists(sqlite, "team_awards", "award")) {
        sqlite.exec(
            "UPDATE team_awards SET meta = '{}' WHERE meta IS NULL OR typeof(meta) <> 'text'",
        );
        sqlite.exec(`
      INSERT OR IGNORE INTO awards(namespace, name, description, icon, color)
      SELECT DISTINCT award, award, award, 'i-lucide-award', 'gold'
      FROM team_awards
    `);
    }
}

/**
 * Brings legacy databases (created from sql/archive/init.sql) up to date with
 * the current Drizzle schema without dropping existing data.
 *
 * @param sqlite - SQLite database instance (bun:sqlite or better-sqlite3)
 */
function migrateLegacySchema(sqlite: PortableSqlite) {
    migrateLegacyAwardsSchema(sqlite);

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
        "show_scores",
        "show_ranking",
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

    // Missing tweak columns on the legacy seasons table
    const seasonTweakColumns: Array<{ name: string; ddl: string }> = [
        { name: "status", ddl: "TEXT NOT NULL DEFAULT 'not_started'" },
        { name: "voting_enabled", ddl: "INTEGER NOT NULL DEFAULT 0" },
        { name: "results_published", ddl: "INTEGER NOT NULL DEFAULT 0" },
        { name: "judging_open", ddl: "INTEGER NOT NULL DEFAULT 0" },
        { name: "show_scores", ddl: "INTEGER NOT NULL DEFAULT 0" },
        { name: "show_ranking", ddl: "INTEGER NOT NULL DEFAULT 0" },
        { name: "max_votes_per_user", ddl: "INTEGER NOT NULL DEFAULT 0" },
        { name: "schedule_start", ddl: "TEXT" },
        { name: "schedule_end", ddl: "TEXT" },
        { name: "start_timestamp", ddl: "INTEGER NOT NULL DEFAULT 0" },
        { name: "end_timestamp", ddl: "INTEGER NOT NULL DEFAULT 0" },
        { name: "voting_start_timestamp", ddl: "INTEGER NOT NULL DEFAULT 0" },
        { name: "voting_end_timestamp", ddl: "INTEGER NOT NULL DEFAULT 0" },
        { name: "results_open_timestamp", ddl: "INTEGER NOT NULL DEFAULT 0" },
        { name: "theme_name", ddl: "TEXT" },
        { name: "theme_description", ddl: "TEXT" },
    ];
    for (const { name, ddl } of seasonTweakColumns) {
        if (!columnExists(sqlite, "seasons", name)) {
            sqlite.exec(`ALTER TABLE seasons ADD COLUMN ${name} ${ddl}`);
            console.log(`[Nitro] Added legacy-missing column: seasons.${name}`);
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

    for (const column of ["auth_issuer", "auth_subject"]) {
        if (!columnExists(sqlite, "users", column)) {
            sqlite.exec(`ALTER TABLE users ADD COLUMN ${column} TEXT`);
            console.log(`[Nitro] Added legacy-missing column: users.${column}`);
        }
    }
    sqlite.exec(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_identity ON users(auth_issuer, auth_subject)",
    );
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

    return sqlite;
}

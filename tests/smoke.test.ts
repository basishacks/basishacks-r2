import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDatabase, resetTestDatabase, type SQLiteDatabase } from "./setup";

// Smoke test to verify the test framework and database helpers work correctly

describe("test framework smoke test", () => {
    it("basic assertions work", () => {
        expect(1 + 1).toBe(2);
    });

    it("vitest globals are available", () => {
        expect(describe).toBeDefined();
        expect(it).toBeDefined();
        expect(expect).toBeDefined();
    });
});

describe("in-memory SQLite database", () => {
    let db: SQLiteDatabase;

    beforeAll(async () => {
        db = await createTestDatabase();
    });

    afterAll(() => {
        db.close();
    });

    it("creates all tables from the schema", () => {
        const tables = db
            .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            .all<{ name: string }>();
        const names = tables.results.map((r) => r.name);

        expect(names).toContain("hackathon");
        expect(names).toContain("teams");
        expect(names).toContain("users");
        expect(names).toContain("ballots");
        expect(names).toContain("ballot_scores");
        expect(names).toContain("team_scores");
        expect(names).toContain("oauth2_applications");
        expect(names).toContain("sc_votes");
    });

    it("supports INSERT and SELECT", () => {
        db.prepare(
            "INSERT INTO hackathon (id, status, start_timestamp, end_timestamp, voting_start_timestamp, voting_end_timestamp, results_open_timestamp) VALUES (1, ?, 0, 0, 0, 0, 0)",
        )
            .bind("not_started")
            .run();

        const row = db.prepare("SELECT * FROM hackathon WHERE id = 1").first<{ status: string }>();
        expect(row).toBeDefined();
        expect(row!.status).toBe("not_started");
    });

    it("resetTestDatabase clears all data", () => {
        // Insert a team
        db.prepare("INSERT INTO teams (name, pathway) VALUES ('test-team', 'junior')").run();
        let count = db.prepare("SELECT COUNT(*) as cnt FROM teams").first<{ cnt: number }>();
        expect(count!.cnt).toBe(1);

        resetTestDatabase(db);

        count = db.prepare("SELECT COUNT(*) as cnt FROM teams").first<{ cnt: number }>();
        expect(count!.cnt).toBe(0);
    });

    it("foreign keys are enforced", () => {
        // Inserting a user with a non-existent team_id should fail
        expect(() => {
            db.prepare(
                "INSERT INTO users (email, role, team_id) VALUES ('test@test.com', 'participant', 9999)",
            ).run();
        }).toThrow();
    });
});
